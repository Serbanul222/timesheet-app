// lib/timesheet-utils.ts - Updated with European date formatting and Romanian day names
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, isWeekend as isFnsWeekend } from 'date-fns'
import { DayData, type TimesheetGridData } from '@/types/timesheet-grid'
import { AbsenceType } from '@/lib/services/absenceTypesService'
import { AbsenceHoursRules } from '@/lib/validation/absenceHoursRules'

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

export function formatDateLocal(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function generateDefaultTimesheetData(): TimesheetGridData {
  const period = getDefaultPeriod();
  const now = new Date().toISOString();

  return {
    id: '',
    storeId: '',
    zoneId: '',
    startDate: period.startDate.toISOString(),
    endDate: period.endDate.toISOString(),
    entries: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function generateDateRange(startDate: Date, endDate: Date): Date[] {
  try {
    return eachDayOfInterval({ start: startDate, end: endDate })
  } catch (error) {
    console.error('Error generating date range:', error)
    return []
  }
}

export function getDefaultPeriod() {
  const now = new Date()
  const start = startOfMonth(now)
  const end = endOfMonth(now)
  
  return {
    startDate: start,
    endDate: end,
    startDateDisplay: format(start, 'dd/MM/yyyy'),
    endDateDisplay: format(end, 'dd/MM/yyyy'),
    startDateInput: format(start, 'yyyy-MM-dd'),
    endDateInput: format(end, 'yyyy-MM-dd'),
    monthDisplay: `1-${end.getDate()} ${format(start, 'MMMM yyyy')}`
  }
}

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
 * NEW: Calculate total hours using centralized absence rules
 * Full-day absences automatically contribute 8 hours to totals
 */
export function calculateTotalHours(
  days: Record<string, DayData>,
  absenceTypes: AbsenceType[] = []
): number {
  if (!days) return 0

  return AbsenceHoursRules.calculateTotalEffectiveHours(days, absenceTypes)
}

export function getPeriodDisplayString(startDate: Date | string, endDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  return `${format(start, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`
}

export function getMonthRangeDisplay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const year = dateObj.getFullYear()
  const month = dateObj.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  return `1-${lastDay.getDate()} ${format(firstDay, 'MMMM yyyy')}`
}

export function isWeekend(date: Date): boolean {
  return isFnsWeekend(date)
}

export function getNextWorkingDay(date: Date): Date {
  let nextDay = addDays(date, 1)
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1)
  }
  return nextDay
}

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
  if (diffMinutes < 0) diffMinutes += 24 * 60
  
  return Math.round((diffMinutes / 60) * 100) / 100
}

export function formatTimeForGrid(date: Date): {
  dayName: string
  dayNumber: string
  isWeekend: boolean
  fullDate: string
} {
  const dayOfWeek = date.getDay()
  
  return {
    dayName: ROMANIAN_DAYS[dayOfWeek as keyof typeof ROMANIAN_DAYS],
    dayNumber: format(date, 'd'),
    isWeekend: isWeekend(date),
    fullDate: format(date, 'dd/MM/yyyy')
  }
}

export function getDaysCount(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

export function getRomanianDayName(date: Date, abbreviated: boolean = true): string {
  const dayOfWeek = date.getDay()
  
  if (abbreviated) {
    return ROMANIAN_DAYS[dayOfWeek as keyof typeof ROMANIAN_DAYS]
  }
  
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

export function getAllRomanianDays(abbreviated: boolean = true) {
  if (abbreviated) {
    return Object.values(ROMANIAN_DAYS)
  }
  
  return ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
}