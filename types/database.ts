// types/database.ts

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

// ✅ ENHANCED: Multi-employee timesheet structure with time intervals
export interface TimesheetEmployeeData {
  name: string
  position: string
  employee_code?: string
  days: Record<string, {
    timeInterval: string    // ✅ NEW: Original time interval (e.g., "10-12", "9:00-17:00")
    startTime: string      // ✅ NEW: Parsed start time (e.g., "10:00", "09:00")
    endTime: string        // ✅ NEW: Parsed end time (e.g., "12:00", "17:00")
    hours: number          // ✅ EXISTING: Calculated hours
    status: string         // ✅ EXISTING: Status (work, off, CO, etc.)
    notes: string          // ✅ EXISTING: Notes
  }>
}

// ✅ ENHANCED: Updated to support both new and legacy formats
export interface TimesheetDailyEntries {
  // ✅ ENHANCED: Metadata with version tracking for migration
  metadata: {
    version: string        // Track data format version (e.g., "2.0")
    gridId: string
    gridSessionId: string
    createdAt: string
    totalEmployees: number
    storeId: string
    zoneName?: string
    storeName?: string
    periodDays: number
    hasTimeIntervals: boolean  // ✅ NEW: Flag to indicate interval support
  }

  // ✅ ENHANCED: Employee metadata separate from daily data
  employees: Record<string, {
    id: string
    name: string
    position: string
    employee_code?: string
    original_store_id?: string
    original_zone_id?: string
    current_store_id?: string
  }>

  // ✅ ENHANCED: Daily data by date, then by employee ID with time intervals
  dailyData: Record<string, Record<string, {
    employee_id: string
    employee_name: string
    position: string
    timeInterval: string      // ✅ NEW: Original interval string (e.g., "9-17", "10:30-14:30")
    startTime: string         // ✅ NEW: Parsed start time (24h format: "09:00", "10:30")
    endTime: string           // ✅ NEW: Parsed end time (24h format: "17:00", "14:30")
    hours: number            // ✅ EXISTING: Calculated hours
    status: string           // ✅ EXISTING: Status
    notes: string            // ✅ EXISTING: Notes
  }>>
}


// Add these types to your types/database.ts file

// ✅ NEW: Save operation configuration
export interface SaveOptions {
  gridSessionId: string;
  createdBy: string;
  skipValidation?: boolean;
  backupBeforeSave?: boolean;
  notifyOnComplete?: boolean;
}

// ✅ NEW: Save operation result
export interface SaveResult {
  success: boolean;
  savedCount: number;
  failedCount: number;
  errors: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
    details?: any;
  }>;
  savedTimesheets: Array<{
    employeeId: string;
    employeeName: string;
    timesheetId: string;
    isUpdate: boolean;
  }>;
  sessionId: string;
  warnings?: string[];
  validationResults?: {
    errors: any[];
    warnings: any[];
    setupErrors: any[];
  };
}


export interface EmployeeTransfers {
  Row: {
    id: string
    employee_id: string
    from_store_id: string
    to_store_id: string
    from_zone_id: string
    to_zone_id: string
    initiated_by: string
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
    approved_by: string | null
    transfer_date: string
    notes: string | null
    created_at: string
    updated_at: string
    completed_at: string | null
  }
  Insert: Omit<EmployeeTransfers['Row'], 'id' | 'created_at' | 'updated_at' | 'completed_at'> & {
    id?: string
    status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
    created_at?: string
    updated_at?: string
    completed_at?: string | null
  }
  Update: Partial<Omit<EmployeeTransfers['Row'], 'id'>>
}

// ✅ ENHANCED: Legacy DailyEntry for backward compatibility with time intervals
export interface DailyEntry {
  readonly date: string;
  readonly hours?: string | null;
  readonly status?: 'work' | 'off' | 'CO' | 'other' | null;
  // ✅ NEW: Legacy support for time intervals
  readonly timeInterval?: string | null;
  readonly startTime?: string | null;
  readonly endTime?: string | null;
}

// ✅ NEW: Time interval utility types
export interface ParsedTimeInterval {
  startTime: string;    // 24h format: "09:00"
  endTime: string;      // 24h format: "17:00"
  hours: number;        // Calculated duration
  isValid: boolean;     // Whether parsing was successful
  originalInterval: string; // Original input
}

export interface TimeIntervalValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsed?: ParsedTimeInterval;
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
      is_active: boolean // Added based on usage in your validation
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

  // ✅ ENHANCED: Timesheets table for multi-employee support with time intervals
  export interface Timesheets {
    Row: {
      id: string
      store_id: string
      zone_id: string
      period_start: string
      period_end: string
      total_hours: number
      employee_count: number
      grid_title: string | null
      notes: string | null
      created_by: string | null
      created_at: string
      updated_at: string
      // ✅ ENHANCED: Now supports time intervals in the JSON structure
      daily_entries: Json | null // Contains TimesheetDailyEntries with time intervals
      // ✅ NEW: Schema version for migration support
      schema_version: string | null // e.g., "2.0" for time interval support
    }
    Insert: Omit<Timesheets['Row'], 'id' | 'created_at' | 'updated_at'> & {
      id?: string
      total_hours?: number
      employee_count?: number
      schema_version?: string
    }
    Update: Partial<Omit<Timesheets['Row'], 'id'>>
  }

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
      employee_transfers: EmployeeTransfers // Added for clarity
      timesheets: DatabaseTables.Timesheets
      absence_types: DatabaseTables.AbsenceTypes
    }
    Views: Record<string, never>
    Functions: { // <<-- THE ONLY ADDITION IS HERE
      complete_employee_transfer: {
        Args: {
          transfer_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: UserRole
      delegation_status: DelegationStatus
      transfer_status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
    }
    CompositeTypes: Record<string, never>
  }
}