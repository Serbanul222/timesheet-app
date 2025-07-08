// types/timesheet-grid.ts

export type DayStatus = 'off' | 'CO' | 'CM' | 'dispensa'

export interface DayData {
  startTime?: string // e.g., "10:00"
  endTime?: string   // e.g., "12:00"
  hours: number      // calculated from interval or manual
  status: DayStatus
  notes: string
}

export interface TimesheetEntry {
  employeeId: string
  employeeName: string
  position: string
  days: Record<string, DayData> // key is date string (YYYY-MM-DD)
}

export interface TimesheetGridData {
  id: string
  startDate: string
  endDate: string
  entries: TimesheetEntry[]
  createdAt: string
  updatedAt: string
  storeId?: string
  zoneId?: string
  createdBy?: string
}

export interface TimesheetGridFilters {
  storeId?: string
  zoneId?: string
  startDate?: Date
  endDate?: Date
  employeeIds?: string[]
}

// Response types for API
export interface CreateTimesheetGridRequest {
  storeId: string
  zoneId: string
  startDate: string
  endDate: string
  employeeIds: string[]
}

export interface UpdateTimesheetGridRequest {
  id: string
  entries: TimesheetEntry[]
}