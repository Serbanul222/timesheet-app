// types/timesheet-grid.ts

// ✅ FIX: Added 'alege' to the DayStatus union type.
export type DayStatus = 'alege' | 'off' | 'CO' | 'CM' | 'dispensa'

export interface DayData {
  startTime?: string // e.g., "10:00"
  endTime?: string   // e.g., "12:00"
  timeInterval?: string // e.g., "10-12" for display
  hours: number      // calculated from interval
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

// Utility functions for time calculations
export function parseTimeInterval(interval: string): { startTime: string; endTime: string; hours: number } | null {
  // Parse formats like "10-12", "9:30-17:30", "10-14"
  const regex = /^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/
  const match = interval.trim().match(regex)
  
  if (!match) return null
  
  const [, start, end] = match
  
  // Normalize time format (add :00 if missing)
  const startTime = start.includes(':') ? start : `${start}:00`
  const endTime = end.includes(':') ? end : `${end}:00`
  
  // Calculate hours
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const diffMinutes = endMinutes - startMinutes
  const hours = diffMinutes > 0 ? diffMinutes / 60 : 0
  
  return { startTime, endTime, hours }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}
