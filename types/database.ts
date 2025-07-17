// types/database.ts - Optimized to reduce bundle size
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Use const assertions for better tree-shaking
export const USER_ROLES = ['HR', 'ASM', 'STORE_MANAGER'] as const
export const DELEGATION_STATUSES = ['active', 'expired', 'revoked', 'pending'] as const

export type UserRole = typeof USER_ROLES[number]
export type DelegationStatus = typeof DELEGATION_STATUSES[number]

// Optimize DailyEntry with minimal structure
export interface DailyEntry {
  readonly date: string;
  readonly hours?: string | null;
  readonly status?: 'work' | 'off' | 'CO' | 'other' | null;
}

// Use interface merging instead of large single interface
interface BaseGridEntry {
  timeInterval: string;
  hours: number;
  status: string;
  notes: string;
}

interface GridMetadata {
  _metadata?: {
    employeeName: string;
    employeeId: string;
    position?: string;
    employeeCode?: string;
    transformedAt: string;
  };
}

export type GridDailyEntries = GridMetadata & {
  [dateKey: string]: BaseGridEntry;
}

// Break down Database interface into smaller, more manageable pieces
namespace DatabaseTables {
  export interface Profiles {
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
    Insert: Omit<Profiles['Row'], 'created_at'> & {
      created_at?: string
      role?: UserRole
    }
    Update: Partial<Omit<Profiles['Row'], 'id'>>
  }

  export interface Employees {
    Row: {
      id: string
      full_name: string
      position: string | null
      employee_code: string | null
      store_id: string
      zone_id: string
      created_at: string
    }
    Insert: Omit<Employees['Row'], 'id' | 'created_at'> & {
      id?: string
      created_at?: string
    }
    Update: Partial<Omit<Employees['Row'], 'id'>>
  }

  export interface Stores {
    Row: {
      id: string
      name: string
      zone_id: string
      created_at: string
    }
    Insert: Omit<Stores['Row'], 'id' | 'created_at'> & {
      id?: string
      created_at?: string
    }
    Update: Partial<Omit<Stores['Row'], 'id'>>
  }

  export interface Zones {
    Row: {
      id: string
      name: string
      created_at: string
    }
    Insert: Omit<Zones['Row'], 'id' | 'created_at'> & {
      id?: string
      created_at?: string
    }
    Update: Partial<Omit<Zones['Row'], 'id'>>
  }

  export interface EmployeeDelegations {
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
    Insert: Omit<EmployeeDelegations['Row'], 'id' | 'created_at' | 'updated_at'> & {
      id?: string
      status?: DelegationStatus
      auto_return?: boolean
      extension_count?: number
      created_at?: string
      updated_at?: string
    }
    Update: Partial<Omit<EmployeeDelegations['Row'], 'id'>>
  }

  export interface Timesheets {
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
    Insert: Omit<Timesheets['Row'], 'id' | 'created_at' | 'updated_at'> & {
      id?: string
      total_hours?: number
    }
    Update: Partial<Omit<Timesheets['Row'], 'id'>>
  }
}

// Main Database interface using namespace for better organization
export interface Database {
  public: {
    Tables: {
      profiles: DatabaseTables.Profiles
      employees: DatabaseTables.Employees
      stores: DatabaseTables.Stores
      zones: DatabaseTables.Zones
      employee_delegations: DatabaseTables.EmployeeDelegations
      timesheets: DatabaseTables.Timesheets
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      delegation_status: DelegationStatus
    }
    CompositeTypes: Record<string, never>
  }
}

// Export specific table types for better tree-shaking
export type ProfileRow = DatabaseTables.Profiles['Row']
export type EmployeeRow = DatabaseTables.Employees['Row']
export type StoreRow = DatabaseTables.Stores['Row']
export type ZoneRow = DatabaseTables.Zones['Row']
export type DelegationRow = DatabaseTables.EmployeeDelegations['Row']
export type TimesheetRow = DatabaseTables.Timesheets['Row']