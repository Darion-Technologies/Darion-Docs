import { hasPermission } from '../services/rbac.mjs'

export function accessDeniedResponse() {
  return {
    success: false,
    message: 'Access Denied'
  }
}

export function requirePermission(permissionKey) {
  return async function permissionMiddleware(context) {
    const userId = context.userId

    if (!userId) {
      return { allowed: false, status: 401, body: accessDeniedResponse() }
    }

    try {
      const allowed = await hasPermission(userId, permissionKey)
      if (!allowed) {
        return { allowed: false, status: 403, body: accessDeniedResponse() }
      }

      return { allowed: true }
    } catch {
      return { allowed: false, status: 503, body: { success: false, message: 'Authorization service unavailable.' } }
    }
  }
}

export const requireManageRoles = requirePermission('manage_roles')
export const requireViewApiDocs = requirePermission('view_api_docs')
export const requireViewDocuments = requirePermission('view_documents')
export const requireManageUsers = requirePermission('manage_users')
