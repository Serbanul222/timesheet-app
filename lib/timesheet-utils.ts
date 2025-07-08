// lib/timesheet-utils.ts

import { type DayStatus } from '@/types/timesheet-grid'

// Updated DayData interface to match our new structure
interface DayData {
  timeInterval?: string
  startTime?: string
  endTime?: string
  hours: number
  status: DayStatus
  notes: string
}

/**
 * Generate array of dates between start and end date (inclusive)
 * Like creating a range in Java - generates consecutive dates
 */
export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const currentDate = new Date(startDate)
  
  // Ensure we're working with clean dates (no time component)
  currentDate.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  console.log('Generating date range from:', currentDate.toISOString(), 'to:', end.toISOString())
  
  while (currentDate <= end) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  console.log('Generated', dates.length, 'dates:', dates.map(d => d.toISOString().split('T')[0]))
  return dates
}

/**
 * Calculate total hours from day data
 * Similar to a reduce operation in Java streams
 */
export function calculateTotalHours(days: Record<string, DayData>): number {
  return Object.values(days).reduce((total, day) => total + day.hours, 0)
}

/**
 * Parse time interval string and calculate hours
 * Examples: "10-12" -> 2 hours, "9:30-17:30" -> 8 hours, "22-06" -> 8 hours (overnight)
 * This is like a utility method in Java that parses strings and returns structured data
 */
export function parseTimeInterval(interval: string): { startTime: string; endTime: string; hours: number } | null {
  if (!interval || !interval.trim()) return null
  
  // Parse formats like "10-12", "9:30-17:30", "10-14", "22-06" (overnight)
  const regex = /^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/
  const match = interval.trim().match(regex)
  
  if (!match) return null
  
  const [, start, end] = match
  
  // Normalize time format (add :00 if missing)
  const startTime = start.includes(':') ? start : `${start}:00`
  const endTime = end.includes(':') ? end : `${end}:00`
  
  // Validate time format
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return null
  }
  
  // Calculate hours
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  
  // Handle overnight shifts (like 22:00-06:00)
  let diffMinutes = endMinutes - startMinutes
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60 // Add 24 hours for overnight shifts
  }
  
  // Prevent unrealistic shifts (more than 16 hours)
  if (diffMinutes > 16 * 60) {
    return null
  }
  
  const hours = diffMinutes / 60
  
  return { 
    startTime, 
    endTime, 
    hours: Math.round(hours * 100) / 100 // Round to 2 decimal places
  }
}

/**
 * Convert time string to minutes since midnight
 * Like a helper method in Java for time calculations
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

/**
 * Validate time format (HH:MM)
 * Similar to input validation in Java
 */
function isValidTime(time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

/**
 * Format time interval for display
 * Like a toString() method in Java
 */
export function formatTimeInterval(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  
  // Convert back to simple format if possible (remove :00)
  const formatTime = (time: string) => {
    return time.endsWith(':00') ? time.slice(0, -3) : time
  }
  
  return `${formatTime(startTime)}-${formatTime(endTime)}`
}

/**
 * Get start and end of current month
 * Like Calendar.getInstance() in Java
 */
export function getCurrentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  
  return { start, end }
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

/**
 * Format date for display in grid headers
 */
export function formatGridDate(date: Date): { day: string; number: string } {
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    number: date.getDate().toString()
  }
}

/**
 * Validate timesheet period
 */
export function validateTimesheetPeriod(startDate: Date, endDate: Date): string | null {
  if (startDate >= endDate) {
    return 'End date must be after start date'
  }
  
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff > 31) {
    return 'Timesheet period cannot exceed 31 days'
  }
  
  return null
}

/**
 * Get default timesheet period (current month)
 */
export function getDefaultPeriod(): { startDate: Date; endDate: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  return {
    startDate: new Date(year, month, 1),
    endDate: new Date(year, month + 1, 0)
  }
}

/**
 * Calculate working days in a period (excluding weekends)
 */
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  const dates = generateDateRange(startDate, endDate)
  return dates.filter(date => !isWeekend(date)).length
}

/**
 * Calculate statistics for timesheet
 * Like a data analysis method in Java
 */
export function calculateTimesheetStats(days: Record<string, DayData>): {
  totalHours: number
  workingDays: number
  daysOff: number
  averageHoursPerDay: number
  statusCounts: Record<DayStatus, number>
} {
  const dayValues = Object.values(days)
  const totalHours = dayValues.reduce((sum, day) => sum + day.hours, 0)
  const workingDays = dayValues.filter(day => day.hours > 0).length
  const daysOff = dayValues.filter(day => day.status === 'off').length
  
  const statusCounts: Record<DayStatus, number> = {
    'off': 0,
    'CO': 0,
    'CM': 0,
    'dispensa': 0
  }
  
  dayValues.forEach(day => {
    statusCounts[day.status]++
  })
  
  return {
    totalHours,
    workingDays,
    daysOff,
    averageHoursPerDay: workingDays > 0 ? totalHours / workingDays : 0,
    statusCounts
  }
}

/**
 * Export timesheet data to CSV format
 * Like a data export utility in Java
 */
export function exportToCSV(
  timesheetData: any,
  dateRange: Date[]
): string {
  const headers = [
    'Employee Name',
    'Position',
    ...dateRange.map(date => date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })),
    'Total Hours'
  ]
  
  const rows = timesheetData.entries.map((entry: any) => [
    entry.employeeName,
    entry.position,
    ...dateRange.map(date => {
      const dateKey = date.toISOString().split('T')[0]
      const dayData = entry.days[dateKey]
      if (!dayData) return '0'
      
      let cellValue = ''
      if (dayData.timeInterval) {
        cellValue = dayData.timeInterval
      } else if (dayData.hours > 0) {
        cellValue = `${dayData.hours}h`
      }
      
      if (dayData.status !== 'off') {
        cellValue += ` (${dayData.status})`
      }
      
      return cellValue || '0'
    }),
    calculateTotalHours(entry.days).toString()
  ])
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
}

/**
 * Validate time interval input
 * Like input validation in Java forms
 */
export function validateTimeInterval(interval: string): {
  isValid: boolean
  error?: string
  suggestion?: string
} {
  if (!interval.trim()) {
    return { isValid: true } // Empty is valid (clears the cell)
  }
  
  const parsed = parseTimeInterval(interval)
  if (!parsed) {
    return {
      isValid: false,
      error: 'Invalid time format',
      suggestion: 'Use format like "10-12" or "9:30-17:30"'
    }
  }
  
  if (parsed.hours > 16) {
    return {
      isValid: false,
      error: 'Shift too long',
      suggestion: 'Maximum 16 hours per day'
    }
  }
  
  if (parsed.hours < 0.5) {
    return {
      isValid: false,
      error: 'Shift too short',
      suggestion: 'Minimum 30 minutes'
    }
  }
  
  return { isValid: true }
}