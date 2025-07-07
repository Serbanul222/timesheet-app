export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Define the user role enum type
export type UserRole = 'HR' | 'ASM' | 'STORE_MANAGER'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole  // This matches the 'role' column in your schema
          zone_id: string | null
          store_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          zone_id?: string | null
          store_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          zone_id?: string | null
          store_id?: string | null
          created_at?: string
        }
      }
      zones: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          zone_id: string
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          zone_id: string
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          zone_id?: string
          address?: string | null
          created_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          full_name: string
          position: string | null
          employee_code: string | null
          store_id: string
          zone_id: string
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          position?: string | null
          employee_code?: string | null
          store_id: string
          zone_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          position?: string | null
          employee_code?: string | null
          store_id?: string
          zone_id?: string
          created_at?: string
        }
      }
      timesheets: {
        Row: {
          id: string
          employee_id: string
          store_id: string
          zone_id: string
          period_start: string
          period_end: string
          total_hours: number
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          store_id?: string
          zone_id?: string
          period_start: string
          period_end: string
          total_hours?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          store_id?: string
          zone_id?: string
          period_start?: string
          period_end?: string
          total_hours?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}