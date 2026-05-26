import { getSupabaseAdminClient } from '../server.mjs'

const SCHEMA = 'rbac'

function client() {
  const supabase = getSupabaseAdminClient()
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

function table(name) {
  return client().schema(SCHEMA).from(name)
}

export async function getUserRoles(userId) {
  const { data, error } = await table('user_roles')
    .select('id, user_id, role_id, assigned_by, assigned_at, roles:role_id (id, role_name, description)')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

export async function getUserPermissions(userId) {
  const { data: userRoles, error: rolesError } = await table('user_roles')
    .select('role_id')
    .eq('user_id', userId)

  if (rolesError) throw rolesError
  if (!userRoles?.length) return []

  const roleIds = userRoles.map((entry) => entry.role_id)
  const { data, error } = await table('role_permissions')
    .select('permissions:permission_id (id, permission_key, permission_name, description)')
    .in('role_id', roleIds)

  if (error) throw error

  const unique = new Map()
  for (const row of data || []) {
    const permission = row.permissions
    if (permission && !unique.has(permission.permission_key)) {
      unique.set(permission.permission_key, permission)
    }
  }

  return Array.from(unique.values())
}

export async function hasPermission(userId, permissionKey) {
  const permissions = await getUserPermissions(userId)
  return permissions.some(
    (permission) => permission.permission_key === permissionKey || permission.permission_key === '*'
  )
}

export async function getAccessibleDocuments(userId) {
  const permissions = await getUserPermissions(userId)
  const keys = permissions.map((permission) => permission.permission_key)

  if (keys.includes('*')) {
    const { data, error } = await table('documents').select('*').order('title')
    if (error) throw error
    return data || []
  }

  if (!keys.length) return []

  const { data, error } = await table('documents').select('*').in('required_permission', keys).order('title')
  if (error) throw error
  return data || []
}

export async function assignRole({ user_id, role_id, assigned_by }) {
  const { data, error } = await table('user_roles')
    .insert({ user_id, role_id, assigned_by: assigned_by || null })
    .select('*')
    .single()

  if (error) throw error

  await writeAuditLog({
    user_id: assigned_by || user_id,
    action: 'User Role Assigned',
    entity_type: 'user_roles',
    entity_id: data.id,
    metadata: { user_id, role_id }
  })

  return data
}

export async function createRole({ role_name, description = '', permission_keys = [] }) {
  const { data: role, error } = await table('roles')
    .insert({ role_name, description })
    .select('*')
    .single()

  if (error) throw error

  if (permission_keys.length) {
    await setRolePermissions(role.id, permission_keys)
  }

  await writeAuditLog({
    action: 'Role Created',
    entity_type: 'roles',
    entity_id: role.id,
    metadata: { role_name, permission_keys }
  })

  return getRoleById(role.id)
}

export async function updateRole(roleId, { role_name, description, permission_keys }) {
  const updates = {}
  if (role_name !== undefined) updates.role_name = role_name
  if (description !== undefined) updates.description = description

  if (Object.keys(updates).length) {
    const { error } = await table('roles').update(updates).eq('id', roleId)
    if (error) throw error
  }

  if (permission_keys !== undefined) {
    await setRolePermissions(roleId, permission_keys)
    await writeAuditLog({
      action: 'Permission Assigned',
      entity_type: 'roles',
      entity_id: roleId,
      metadata: { permission_keys }
    })
  }

  await writeAuditLog({
    action: 'Role Updated',
    entity_type: 'roles',
    entity_id: roleId,
    metadata: updates
  })

  return getRoleById(roleId)
}

export async function deleteRole(roleId) {
  const { error } = await table('roles').delete().eq('id', roleId)
  if (error) throw error

  await writeAuditLog({
    action: 'Role Deleted',
    entity_type: 'roles',
    entity_id: roleId,
    metadata: {}
  })

  return { id: roleId }
}

export async function listRoles() {
  const { data: roles, error } = await table('roles').select('*').order('role_name')
  if (error) throw error

  const enriched = []
  for (const role of roles || []) {
    enriched.push(await getRoleById(role.id))
  }
  return enriched
}

export async function getRoleById(roleId) {
  const { data: role, error } = await table('roles').select('*').eq('id', roleId).single()
  if (error) throw error

  const { data: permissions, error: permissionsError } = await table('role_permissions')
    .select('permissions:permission_id (id, permission_key, permission_name, description)')
    .eq('role_id', roleId)

  if (permissionsError) throw permissionsError

  return {
    ...role,
    permissions: (permissions || []).map((row) => row.permissions).filter(Boolean)
  }
}

export async function listPermissions() {
  const { data, error } = await table('permissions').select('*').order('permission_key')
  if (error) throw error
  return data || []
}

export async function removeUserRole(userRoleId, actorId) {
  const { data, error } = await table('user_roles').delete().eq('id', userRoleId).select('*').single()
  if (error) throw error

  await writeAuditLog({
    user_id: actorId,
    action: 'Permission Removed',
    entity_type: 'user_roles',
    entity_id: userRoleId,
    metadata: { user_id: data.user_id, role_id: data.role_id }
  })

  return data
}

export async function listDocuments() {
  const { data, error } = await table('documents').select('*').order('title')
  if (error) throw error
  return data || []
}

export async function listAuditLogs(limit = 100) {
  const { data, error } = await table('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

async function setRolePermissions(roleId, permissionKeys) {
  const { data: permissions, error: permissionsError } = await table('permissions')
    .select('id, permission_key')
    .in('permission_key', permissionKeys)

  if (permissionsError) throw permissionsError

  const { error: deleteError } = await table('role_permissions').delete().eq('role_id', roleId)
  if (deleteError) throw deleteError

  if (!permissions?.length) return

  const rows = permissions.map((permission) => ({
    role_id: roleId,
    permission_id: permission.id
  }))

  const { error: insertError } = await table('role_permissions').insert(rows)
  if (insertError) throw insertError
}

export async function writeAuditLog({
  user_id = null,
  action,
  entity_type,
  entity_id = null,
  metadata = {}
}) {
  const { error } = await table('audit_logs').insert({
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  })

  if (error) throw error
}
