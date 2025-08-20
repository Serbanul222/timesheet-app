// lib/timesheet-utils.ts - Updated with European date formatting and Romanian day names
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isWeekend as isFnsWeekend } from 'date-fns'
import { type TimesheetGridData } from '@/types/timesheet-grid'

// Romanian day names mapping
const ROMANIAN_DAYS = {
  0: 'Dum',    // Duminică (Sunday)
  1: 'Lun',    // Luni (Monday)
  2: 'Mar',    // Marți (Tuesday)
  3: 'Mie',    // Miercuri (Wednesday)
  4: 'Joi',    // Joi (Thursday)
  5: 'Vin',    // Vineri (Friday)
  6: 'Sâm'     // Sâmbătă (Saturday)
} as const

/**
 * ✅ UPDATED: Format date for local display (DD/MM/YYYY format)
 */
export function formatDateLocal(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}

export function generateDefaultTimesheetData(): TimesheetGridData {
  const period = getDefaultPeriod();
  
  // Get the current time as an ISO string
  const now = new Date().toISOString();

  return {
    id: '', // No ID for a new timesheet
    storeId: '', // No store selected by default
    zoneId: '',
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
    entries: [],
    createdAt: now, // ✅ FIX: Added required property
    updatedAt: now, // ✅ FIX: Added required property
    // createdBy can be omitted as it's optional
  };
}

/**
 * ✅ UPDATED: Format date for database storage (YYYY-MM-DD format)
 */
export function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * ✅ UPDATED: Generate date range for timesheet grid
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  try {
    return eachDayOfInterval({ start: startDate, end: endDate })
  } catch (error) {
    console.error('Error generating date range:', error)
    return []
  }
}

/**
 * ✅ UPDATED: Get default period with proper European formatting
 */
export function getDefaultPeriod() {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)
  
  return {
    startDate: start,
    endDate: end,
    // For display purposes (European format)
    startDateDisplay: formatDateLocal(start),
    endDateDisplay: formatDateLocal(end),
    // For HTML inputs (ISO format)
    startDateInput: format(start, 'yyyy-MM-dd'),
    endDateInput: format(end, 'yyyy-MM-dd'),
    // Month range display (1-30/31 format)
    monthDisplay: `1-${end.getDate()} ${format(start, 'MMMM yyyy')}`
  }
}

/**
 * ✅ UPDATED: Validate timesheet period
 */
export function validateTimesheetPeriod(startDate: Date, endDate: Date): string | null {
  if (startDate >= endDate) {
    return 'Start date must be before end date'
  }
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays > 31) {
    return 'Period cannot exceed 31 days'
  }
  
  if (diffDays < 1) {
    return 'Period must be at least 1 day'
  }
  
  return null
}

/**
 * Calculate total hours from timesheet entry days
 */
export function calculateTotalHours(days: Record<string, any>): number {
  return Object.values(days).reduce((total, day) => {
    return total + (day?.hours || 0)
  }, 0)
}

/**
 * ✅ NEW: Get period display string for UI components
 */
export function getPeriodDisplayString(startDate: Date | string, endDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  return `${formatDateLocal(start)} - ${formatDateLocal(end)}`
}

/**
 * ✅ NEW: Get month range display (1-30/31 format)
 */
export function getMonthRangeDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  return `1-${lastDay.getDate()} ${format(firstDay, 'MMMM yyyy')}`
}

/**
 * Check if date is weekend
 */
export function isWeekend(date: Date): boolean {
  return isFnsWeekend(date)
}

/**
 * Get next working day
 */
export function getNextWorkingDay(date: Date): Date {
  let nextDay = addDays(date, 1)
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1)
  }
  return nextDay
}

/**
 * ✅ UPDATED: Parse time interval and return hours
 */
export function parseTimeInterval(interval: string): number {
  if (!interval || !interval.trim()) return 0
  
  const regex = /^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/
  const match = interval.trim().match(regex)
  
  if (!match) return 0
  
  const [, start, end] = match
  const startTime = start.includes(':') ? start : `${start}:00`
  const endTime = end.includes(':') ? end : `${end}:00`
  
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + (minutes || 0)
  }
  
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  
  let diffMinutes = endMinutes - startMinutes
  if (diffMinutes < 0) diffMinutes += 24 * 60 // Handle overnight shifts
  
  return Math.round((diffMinutes / 60) * 100) / 100
}

/**
 * ✅ UPDATED: Format time for display in grid headers with Romanian day names
 */
export function formatTimeForGrid(date: Date): {
  dayName: string
  dayNumber: string
  isWeekend: boolean
  fullDate: string
} {
  const dayOfWeek = date.getDay()
  
  return {
    dayName: ROMANIAN_DAYS[dayOfWeek as keyof typeof ROMANIAN_DAYS],
    dayNumber: format(date, 'd'), // 1, 2, 3, etc.
    isWeekend: isWeekend(date),
    fullDate: formatDateLocal(date) // DD/MM/YYYY
  }
}

/**
 * ✅ NEW: Get days count in period
 */
export function getDaysCount(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

/**
 * ✅ NEW: Get Romanian day name for a given date
 */
export function getRomanianDayName(date: Date, abbreviated: boolean = true): string {
  const dayOfWeek = date.getDay()
  
  if (abbreviated) {
    return ROMANIAN_DAYS[dayOfWeek as keyof typeof ROMANIAN_DAYS]
  }
  
  // Full Romanian day names
  const fullDayNames = {
    0: 'Duminică',
    1: 'Luni',
    2: 'Marți',
    3: 'Miercuri',
    4: 'Joi',
    5: 'Vineri',
    6: 'Sâmbătă'
  } as const
  
  return fullDayNames[dayOfWeek as keyof typeof fullDayNames]
}

/**
 * ✅ NEW: Helper function to get all Romanian day names
 */
export function getAllRomanianDays(abbreviated: boolean = true) {
  if (abbreviated) {
    return Object.values(ROMANIAN_DAYS)
  }
  
  return ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
}