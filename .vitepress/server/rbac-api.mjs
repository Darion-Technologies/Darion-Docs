import { isSupabaseServerConfigured } from '../../src/supabase/server.mjs'
import {
  assignRole,
  createRole,
  deleteRole,
  getAccessibleDocuments,
  getUserPermissions,
  getUserRoles,
  hasPermission,
  listAuditLogs,
  listDocuments,
  listPermissions,
  listRoles,
  removeUserRole,
  updateRole
} from '../../src/supabase/services/rbac.mjs'
import { accessDeniedResponse } from '../../src/supabase/middleware/requirePermission.mjs'

const LOCAL_ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    'manage_roles',
    'manage_users',
    'view_documents',
    'upload_documents',
    'edit_documents',
    'delete_documents',
    'download_documents',
    'view_api_docs',
    'view_sdk_docs',
    'view_internal_docs',
    'approve_documents'
  ],
  project_owner: ['view_documents', 'edit_documents', 'view_internal_docs', 'approve_documents'],
  editor: ['view_documents', 'edit_documents', 'view_api_docs', 'view_sdk_docs', 'view_internal_docs'],
  commenter: ['view_documents', 'view_internal_docs'],
  viewer: ['view_documents', 'view_internal_docs'],
  client: ['view_documents', 'view_api_docs']
}

export async function handleRbacApi(request, response, url, method, session, helpers) {
  const { sendJson, readJsonBody } = helpers
  const parts = url.pathname.split('/').filter(Boolean)
  const resource = parts[3]
  const resourceId = parts[4]
  const actorId = resolveActorId(session)

  if (resource === 'me' && method === 'GET') {
    const permissions = await resolveUserPermissions(session)
    sendJson(response, 200, { success: true, data: { user: session.user, permissions } })
    return
  }

  if (resource === 'roles') {
    const guard = await enforcePermission(session, 'manage_roles', helpers)
    if (!guard.allowed) return sendJson(response, guard.status, guard.body)

    if (method === 'GET' && !resourceId) {
      const data = await listRoles()
      return sendJson(response, 200, { success: true, data })
    }

    if (method === 'GET' && resourceId) {
      const { getRoleById } = await import('../../src/supabase/services/rbac.mjs')
      const data = await getRoleById(resourceId)
      return sendJson(response, 200, { success: true, data })
    }

    if (method === 'POST') {
      const body = await readJsonBody(request)
      const data = await createRole(body)
      return sendJson(response, 201, { success: true, data })
    }

    if (method === 'PUT' && resourceId) {
      const body = await readJsonBody(request)
      const data = await updateRole(resourceId, body)
      return sendJson(response, 200, { success: true, data })
    }

    if (method === 'DELETE' && resourceId) {
      const data = await deleteRole(resourceId)
      return sendJson(response, 200, { success: true, data })
    }
  }

  if (resource === 'permissions' && method === 'GET') {
    const guard = await enforcePermission(session, 'manage_roles', helpers)
    if (!guard.allowed) return sendJson(response, guard.status, guard.body)
    const data = await listPermissions()
    return sendJson(response, 200, { success: true, data })
  }

  if (resource === 'user-roles') {
    const guard = await enforcePermission(session, 'manage_users', helpers)
    if (!guard.allowed) return sendJson(response, guard.status, guard.body)

    if (method === 'GET' && resourceId) {
      const data = await getUserRoles(resourceId)
      return sendJson(response, 200, { success: true, data })
    }

    if (method === 'POST') {
      const body = await readJsonBody(request)
      const data = await assignRole({ ...body, assigned_by: actorId })
      return sendJson(response, 201, { success: true, data })
    }

    if (method === 'DELETE' && resourceId) {
      const data = await removeUserRole(resourceId, actorId)
      return sendJson(response, 200, { success: true, data })
    }
  }

  if (resource === 'documents' && method === 'GET') {
    const guard = await enforcePermission(session, 'view_documents', helpers)
    if (!guard.allowed) return sendJson(response, guard.status, guard.body)

    if (!isSupabaseServerConfigured) {
      return sendJson(response, 503, { success: false, message: 'Supabase is not configured.' })
    }

    const data = actorId ? await getAccessibleDocuments(actorId) : await listDocuments()
    return sendJson(response, 200, { success: true, data })
  }

  if (resource === 'audit-logs' && method === 'GET') {
    const guard = await enforcePermission(session, 'manage_users', helpers)
    if (!guard.allowed) return sendJson(response, guard.status, guard.body)
    const data = await listAuditLogs()
    return sendJson(response, 200, { success: true, data })
  }

  sendJson(response, 404, { success: false, message: 'RBAC endpoint not found.' })
}

function resolveActorId(session) {
  if (session.user?.supabaseUserId) return session.user.supabaseUserId
  if (/^[0-9a-f-]{36}$/i.test(session.user?.id || '')) return session.user.id
  return null
}

async function resolveUserPermissions(session) {
  const actorId = resolveActorId(session)

  if (isSupabaseServerConfigured && actorId) {
    return getUserPermissions(actorId)
  }

  const keys = LOCAL_ROLE_PERMISSIONS[session.user.role] || LOCAL_ROLE_PERMISSIONS.viewer
  return keys.map((permission_key) => ({ permission_key }))
}

async function enforcePermission(session, permissionKey, helpers) {
  const actorId = resolveActorId(session)

  if (isSupabaseServerConfigured && actorId) {
    const allowed = await hasPermission(actorId, permissionKey)
    if (!allowed) {
      return { allowed: false, status: 403, body: accessDeniedResponse() }
    }
    return { allowed: true }
  }

  const keys = LOCAL_ROLE_PERMISSIONS[session.user.role] || []
  const allowed = keys.includes('*') || keys.includes(permissionKey)
  if (!allowed) {
    return { allowed: false, status: 403, body: accessDeniedResponse() }
  }

  return { allowed: true }
}
