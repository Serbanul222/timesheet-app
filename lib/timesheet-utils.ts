// lib/timesheet-utils.ts

import { type DayData } from '@/types/timesheet-grid'

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
 * Export timesheet data to CSV format
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
      return dayData ? `${dayData.hours}${dayData.status !== 'off' ? ` (${dayData.status})` : ''}` : '0'
    }),
    calculateTotalHours(entry.days).toString()
  ])
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
}