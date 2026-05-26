export interface Permission {
  id: string
  permission_key: string
  permission_name: string
  description: string
  created_at: string
}

export interface Role {
  id: string
  role_name: string
  description: string
  created_at: string
  updated_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by: string | null
  assigned_at: string
}

export interface RbacDocument {
  id: string
  title: string
  slug: string
  content: string
  required_permission: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CreateRoleInput {
  role_name: string
  description?: string
  permission_keys?: string[]
}

export interface UpdateRoleInput {
  role_name?: string
  description?: string
  permission_keys?: string[]
}

export interface AssignRoleInput {
  user_id: string
  role_id: string
  assigned_by?: string
}

export interface AccessDeniedResponse {
  success: false
  message: 'Access Denied'
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}
