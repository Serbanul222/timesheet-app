export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'HR' | 'ASM' | 'STORE_MANAGER'

// Define the structure of a single entry in our new column
export type DailyEntry = {
  date: string;
  hours?: string | null;
  status?: 'work' | 'off' | 'CO' | 'other' | null;
}

export interface Database {
  public: {
    Tables: {
      // ... other tables are unchanged
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
        // ... Insert and Update are unchanged
      }
      timesheets: {
        Row: {
          id: string
          employee_id: string
          store_id: string
          zone_id: string
          period_start: string
          period_end: string
          total_hours: number // We'll keep this for now
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          daily_entries: DailyEntry[] | null // Add the new column here
        }
        Insert: {
          id?: string
          employee_id: string
          store_id: string
          zone_id: string
          period_start: string
          period_end: string
          total_hours?: number
          notes?: string | null
          created_by?: string | null
          daily_entries?: DailyEntry[] | null // Add to Insert type
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
          daily_entries?: DailyEntry[] | null // Add to Update type
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