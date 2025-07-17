// types/database.ts - Updated for multi-employee timesheets
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

// ✅ NEW: Multi-employee timesheet structure
export interface TimesheetEmployeeData {
  name: string
  position: string
  employee_code?: string
  days: Record<string, {
    timeInterval: string
    hours: number
    status: string
    notes: string
  }>
}

export interface TimesheetDailyEntries {
  employees: Record<string, TimesheetEmployeeData> // key = employee_id
  metadata: {
    gridId: string
    gridSessionId: string
    createdAt: string
    totalEmployees: number
    storeId: string
    zoneName?: string
    storeName?: string
    periodDays: number
  }
}

// Legacy DailyEntry for backward compatibility (if needed)
export interface DailyEntry {
  readonly date: string;
  readonly hours?: string | null;
  readonly status?: 'work' | 'off' | 'CO' | 'other' | null;
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

  // ✅ UPDATED: Timesheets table for multi-employee support
  export interface Timesheets {
    Row: {
      id: string
      // ❌ REMOVED: employee_id (no longer single employee)
      // ❌ REMOVED: employee_name (stored in daily_entries now)
      store_id: string
      zone_id: string
      period_start: string
      period_end: string
      total_hours: number
      employee_count: number // ✅ NEW: number of employees in this timesheet
      grid_title: string | null // ✅ NEW: optional title for the timesheet grid
      notes: string | null
      created_by: string | null
      created_at: string
      updated_at: string
      daily_entries: Json | null // ✅ CORRECTED TYPE
    }
    Insert: Omit<Timesheets['Row'], 'id' | 'created_at' | 'updated_at'> & {
      id?: string
      total_hours?: number
      employee_count?: number
    }
    Update: Partial<Omit<Timesheets['Row'], 'id'>>
  }

  // ✅ NEW: Absence types table (if not already in your schema)
  export interface AbsenceTypes {
    Row: {
      id: string
      code: string
      name: string
      description: string | null
      is_active: boolean
      requires_hours: boolean
      color_class: string | null
      sort_order: number
      created_at: string
      updated_at: string
    }
    Insert: Omit<AbsenceTypes['Row'], 'id' | 'created_at' | 'updated_at'> & {
      id?: string
      is_active?: boolean
      requires_hours?: boolean
      sort_order?: number
    }
    Update: Partial<Omit<AbsenceTypes['Row'], 'id'>>
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
      absence_types: DatabaseTables.AbsenceTypes // ✅ NEW: if you have this table
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
export type AbsenceTypeRow = DatabaseTables.AbsenceTypes['Row']

// ✅ NEW: Helper types for working with multi-employee timesheets
export interface TimesheetWithDetails extends TimesheetRow {
  store?: { id: string; name: string }
  zone?: { id: string; name: string }
  created_by_user?: { id: string; full_name: string }
  // Note: employees are now stored in daily_entries.employees
}

// ✅ NEW: Type for reconstructing grid from database
export interface TimesheetGridFromDB {
  timesheetId: string
  gridTitle: string | null
  storeId: string
  storeName?: string
  zoneId: string
  zoneName?: string
  periodStart: string
  periodEnd: string
  employeeCount: number
  totalHours: number
  employees: Array<{
    id: string
    name: string
    position: string
    employee_code?: string
    totalHours: number
    daysData: Record<string, {
      timeInterval: string
      hours: number
      status: string
      notes: string
    }>
  }>
  createdAt: string
  updatedAt: string
  createdBy?: string
}

// ✅ NEW: Type for timesheet summary/list view
export interface TimesheetSummary {
  id: string
  gridTitle: string
  storeName: string
  employeeCount: number
  totalHours: number
  periodStart: string
  periodEnd: string
  createdAt: string
  lastUpdated: string
}