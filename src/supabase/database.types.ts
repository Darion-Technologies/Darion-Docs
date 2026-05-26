export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  rbac: {
    Tables: {
      permissions: {
        Row: {
          id: string
          permission_key: string
          permission_name: string
          description: string
          created_at: string
        }
        Insert: {
          id?: string
          permission_key: string
          permission_name: string
          description?: string
          created_at?: string
        }
        Update: {
          permission_key?: string
          permission_name?: string
          description?: string
        }
      }
      roles: {
        Row: {
          id: string
          role_name: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          role_name: string
          description?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          role_name?: string
          description?: string
          updated_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          id?: string
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          role_id?: string
          permission_id?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role_id: string
          assigned_by: string | null
          assigned_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: string
          assigned_by?: string | null
          assigned_at?: string
        }
        Update: {
          role_id?: string
          assigned_by?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          required_permission: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content?: string
          required_permission: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          slug?: string
          content?: string
          required_permission?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          metadata?: Json
        }
      }
    }
  }
}
