// types/database.ts - Updated with delegation table
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'HR' | 'ASM' | 'STORE_MANAGER'
export type DelegationStatus = 'active' | 'expired' | 'revoked' | 'pending'

// Updated DailyEntry to match our actual usage
export type DailyEntry = {
  date: string;
  hours?: string | null;
  status?: 'work' | 'off' | 'CO' | 'other' | null;
}

// Type for our grid-based daily entries (JSON object with date keys)
export type GridDailyEntries = {
  _metadata?: {
    employeeName: string;
    employeeId: string;
    position?: string;
    employeeCode?: string;
    transformedAt: string;
  };
  [dateKey: string]: {
    timeInterval: string;
    hours: number;
    status: string;
    notes: string;
  } | any; // Allow metadata object
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          zone_id: string | null
          store_id: string | null
          created_at: string
          updated_at?: string
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
          updated_at?: string
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
          zone_id: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          position?: string | null
          employee_code?: string | null
          store_id?: string
          zone_id?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          zone_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          zone_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          zone_id?: string
        }
      }
      zones: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
        }
      }
      // NEW: Employee Delegations table
      employee_delegations: {
        Row: {
          id: string
          employee_id: string
          from_store_id: string
          to_store_id: string
          from_zone_id: string
          to_zone_id: string
          delegated_by: string
          valid_from: string
          valid_until: string
          status: DelegationStatus
          auto_return: boolean
          extension_count: number
          notes: string | null
          created_at: string
          updated_at: string
          expired_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          from_store_id: string
          to_store_id: string
          from_zone_id: string
          to_zone_id: string
          delegated_by: string
          valid_from: string
          valid_until: string
          status?: DelegationStatus
          auto_return?: boolean
          extension_count?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          expired_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          from_store_id?: string
          to_store_id?: string
          from_zone_id?: string
          to_zone_id?: string
          delegated_by?: string
          valid_from?: string
          valid_until?: string
          status?: DelegationStatus
          auto_return?: boolean
          extension_count?: number
          notes?: string | null
          updated_at?: string
          expired_at?: string | null
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
          daily_entries: DailyEntry[] | null
          employee_name: string | null
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
          daily_entries?: DailyEntry[] | null
          employee_name?: string | null
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
          daily_entries?: DailyEntry[] | null
          employee_name?: string | null
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
      delegation_status: DelegationStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}