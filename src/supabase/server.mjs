import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

export const isSupabaseServerConfigured = Boolean(supabaseUrl && (serviceRoleKey || anonKey))

export function createSupabaseServerClient(options = {}) {
  if (!isSupabaseServerConfigured) return null

  const key = options.useAnon ? anonKey : serviceRoleKey || anonKey

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    db: {
      schema: options.schema || 'rbac'
    }
  })
}

export function getSupabaseAdminClient() {
  return createSupabaseServerClient({ schema: 'rbac' })
}
