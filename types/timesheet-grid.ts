// types/timesheet-grid.ts - Updated with optional ID for creation
import { RowData } from '@tanstack/react-table';
import { Timesheet, Profile, AbsenceType, Delegation } from './database';

// ✅ UPDATED: Dynamic DayStatus that supports database-driven absence types
export type DayStatus = 'alege' | string // 'alege' + any absence type code from database

export interface DayData {
  startTime?: string // e.g., "10:00"
  endTime?: string   // e.g., "12:00"
  timeInterval?: string // e.g., "10-12" for display
  hours: number      // calculated from interval
  status: DayStatus
  notes: string
}

export interface TimesheetCellData {
  value: string;
  isWeekend: boolean;
  isAbsence: boolean;
  isHoliDay: boolean;
  isDelegated: boolean; // Ensure this is always a boolean
}

export interface TimesheetGridOptions {
  canEdit: boolean;
  isSubmitting: boolean;
}

export interface TimesheetGridRowData extends RowData {
  profile: Profile;
  timesheet: Timesheet;
  [key: string]: any;
}

export interface TimesheetGridContext {
  options: TimesheetGridOptions;
  absenceTypes: AbsenceType[];
  updateData: (rowIndex: number, columnId: string, value: any) => void;
  getValidationMessage: (rowIndex: number, columnId: string) => string | null;
  delegations: Delegation[];
}

export interface TimesheetEntry {
  employeeId: string
  employeeName: string
  position: string
  days: Record<string, DayData> // key is date string (YYYY-MM-DD)
}

// UPDATED: Made id optional for creation, required for existing timesheets
export interface TimesheetGridData {
  id?: string // Optional for creation, will be set after save
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

// ✅ NEW: Validation-related types
export interface CellValidationError {
  employeeId: string
  employeeName: string
  date: string
  error: string
  type: 'error' | 'warning' | 'info'
}

export interface GridValidationResult {
  isValid: boolean
  errors: CellValidationError[]
  warnings: CellValidationError[]
  canSave: boolean
}

// ✅ NEW: Absence type integration
export interface AbsenceTypeInfo {
  code: string
  name: string
  description?: string
  requires_hours: boolean
  color_class?: string
  sort_order: number
}

// Utility functions for time calculations
export function parseTimeInterval(interval: string): { startTime: string; endTime: string; hours: number } | null {
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
  
  // Handle overnight shifts (like "22:00-06:00")
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

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

function isValidTime(time: string): boolean {
  const [hours, minutes] = time.split(':').map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

// ✅ NEW: Validation helper functions
export function isWorkingHours(timeInterval: string, hours: number): boolean {
  return hours > 0 || (timeInterval && timeInterval.trim().length > 0)
}

export function isFullDayAbsence(status: DayStatus, absenceTypes: AbsenceTypeInfo[]): boolean {
  if (status === 'alege') return false
  const absenceType = absenceTypes.find(type => type.code === status)
  return absenceType ? !absenceType.requires_hours : false
}

export function isPartialHoursAbsence(status: DayStatus, absenceTypes: AbsenceTypeInfo[]): boolean {
  if (status === 'alege') return false
  const absenceType = absenceTypes.find(type => type.code === status)
  return absenceType ? absenceType.requires_hours : false
}

export function getAbsenceTypeDisplayName(status: DayStatus, absenceTypes: AbsenceTypeInfo[]): string {
  if (status === 'alege') return 'Alege'
  const absenceType = absenceTypes.find(type => type.code === status)
  return absenceType ? absenceType.name : status
}

export function getAbsenceTypeColorClass(status: DayStatus, absenceTypes: AbsenceTypeInfo[]): string {
  if (status === 'alege') return 'bg-white text-blue-700 border-blue-300 border-dashed'
  const absenceType = absenceTypes.find(type => type.code === status)
  return absenceType ? absenceType.color_class || 'bg-gray-100 text-gray-700 border-gray-300' : 'bg-gray-100 text-gray-700 border-gray-300'
}

// ✅ NEW: Validation rule constants
export const VALIDATION_RULES = {
  MAX_HOURS_PER_DAY: 16,
  MIN_HOURS_PER_SHIFT: 0.5,
  MAX_HOURS_PARTIAL_ABSENCE: 8,
  TIME_INTERVAL_REGEX: /^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/,
  WEEKEND_WORK_WARNING_THRESHOLD: 0
} as const

// ✅ NEW: Default status for new cells
export const DEFAULT_CELL_STATUS: DayStatus = 'alege'

// ✅ NEW: Common validation messages
export const VALIDATION_MESSAGES = {
  HOURS_ABSENCE_CONFLICT: 'Nu se pot avea ore de lucru cu o absență de o zi întreagă',
  PARTIAL_HOURS_REQUIRED: 'Acest tip de absență necesită ore de lucru',
  INVALID_TIME_FORMAT: 'Formatul orei este invalid. Folosește "10-12" sau "9:30-17:30"',
  SHIFT_TOO_LONG: 'Tura nu poate depăși 16 ore',
  SHIFT_TOO_SHORT: 'Tura trebuie să aibă cel puțin 30 de minute',
  WEEKEND_WORK: 'S-a detectat lucru în weekend',
  INVALID_STATUS: 'Status selectat invalid'
} as const;