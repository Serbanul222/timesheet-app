// lib/validation/timesheetValidationRules.ts
import { parseTimeInterval } from '@/lib/timesheet-utils'
import { type DayStatus } from '@/types/timesheet-grid'
import { type AbsenceType } from '@/lib/services/absenceTypesService'

export interface ValidationResult {
  isValid: boolean
  message?: string
  type?: 'error' | 'warning' | 'info'
}

export interface CellValidationContext {
  timeInterval: string
  status: DayStatus
  hours: number
  notes?: string
  absenceTypes: AbsenceType[]
  isWeekend?: boolean
}

// ✅ NEW: Grid-level validation context
export interface GridValidationContext {
  storeId?: string
  zoneId?: string
  entries: any[]
  startDate: string
  endDate: string
}

/**
 * Core validation rules for timesheet cells and grids
 */
export class TimesheetValidationRules {
  
  /**
   * Validate a single cell with comprehensive rules
   */
  static validateCell(context: CellValidationContext): ValidationResult {
    const { timeInterval, status, hours, absenceTypes, isWeekend } = context
    
    // Run all validation rules in order
    const rules = [
      this.validateTimeFormat,
      this.validateHoursAbsenceConflict,
      this.validatePartialHours,
      this.validateStatusTransition,
      this.validateWeekendWork
    ]
    
    for (const rule of rules) {
      const result = rule(context)
      if (!result.isValid) {
        return result
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 1: Validate time format
   */
  private static validateTimeFormat(context: CellValidationContext): ValidationResult {
    const { timeInterval } = context
    
    if (!timeInterval || !timeInterval.trim()) {
      return { isValid: true } // Empty is valid
    }
    
    const parsed = parseTimeInterval(timeInterval)
    if (!parsed) {
      return {
        isValid: false,
        message: 'Invalid time format. Use "10-12" or "9:30-17:30"',
        type: 'error'
      }
    }
    
    if (parsed.hours > 16) {
      return {
        isValid: false,
        message: 'Shift cannot exceed 16 hours',
        type: 'error'
      }
    }
    
    if (parsed.hours < 0.5) {
      return {
        isValid: false,
        message: 'Shift must be at least 30 minutes',
        type: 'error'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 2: Validate hours vs absence conflict (NO FLEXIBILITY)
   */
  private static validateHoursAbsenceConflict(context: CellValidationContext): ValidationResult {
    const { timeInterval, status, hours, absenceTypes } = context
    
    const hasWorkingHours = hours > 0 || (timeInterval && timeInterval.trim())
    const absenceType = absenceTypes.find(type => type.code === status)
    const isFullDayAbsence = absenceType && !absenceType.requires_hours
    
    // Case 1: Working hours + full-day absence = INVALID
    if (hasWorkingHours && isFullDayAbsence) {
      return {
        isValid: false,
        message: `Cannot have working hours with ${absenceType.name}`,
        type: 'error'
      }
    }
    
    // Case 2: No hours + partial-hours absence = WARNING (not error)
    // Allow the selection but warn that hours are needed
    if (!hasWorkingHours && absenceType && absenceType.requires_hours && status !== 'alege') {
      return {
        isValid: false, // Still invalid for saving
        message: `${absenceType.name} requires working hours to be specified`,
        type: 'warning' // Changed from 'error' to 'warning'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 3: Validate partial hours absences
   */
  private static validatePartialHours(context: CellValidationContext): ValidationResult {
    const { status, hours, absenceTypes } = context
    
    const absenceType = absenceTypes.find(type => type.code === status)
    
    if (absenceType && absenceType.requires_hours) {
      if (hours <= 0) {
        return {
          isValid: false,
          message: `${absenceType.name} requires working hours`,
          type: 'error'
        }
      }
      
      if (hours > 8) {
        return {
          isValid: false,
          message: `${absenceType.name} cannot exceed 8 hours`,
          type: 'warning'
        }
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 4: Validate status transitions
   */
  private static validateStatusTransition(context: CellValidationContext): ValidationResult {
    const { status, absenceTypes } = context
    
    // Check if status is valid
    if (status !== 'alege' && !absenceTypes.some(type => type.code === status)) {
      return {
        isValid: false,
        message: `Invalid status: ${status}`,
        type: 'error'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 5: Validate weekend work (warning only)
   */
  private static validateWeekendWork(context: CellValidationContext): ValidationResult {
    const { hours, isWeekend } = context
    
    if (isWeekend && hours > 0) {
      return {
        isValid: true, // Valid but with warning
        message: 'Weekend work detected',
        type: 'info'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Validate entire timesheet grid including setup requirements
   */
  static validateGrid(
    entries: any[],
    dateRange: Date[],
    absenceTypes: AbsenceType[],
    gridContext?: GridValidationContext
  ): {
    isValid: boolean
    errors: Array<{
      employeeId: string
      employeeName: string
      date: string
      error: string
    }>
    warnings: Array<{
      employeeId: string
      employeeName: string
      date: string
      warning: string
    }>
    setupErrors: Array<{
      field: string
      error: string
    }>
  } {
    const errors: any[] = []
    const warnings: any[] = []
    const setupErrors: any[] = []
    
    // ✅ NEW: Validate grid setup requirements
    if (gridContext) {
      const setupValidation = this.validateGridSetup(gridContext)
      if (!setupValidation.isValid) {
        setupErrors.push({
          field: 'store',
          error: setupValidation.message || 'Store selection is required'
        })
      }
    }
    
    // Only validate cells if setup is valid
    if (setupErrors.length === 0) {
      entries.forEach(entry => {
        dateRange.forEach(date => {
          const dateKey = date.toISOString().split('T')[0]
          const dayData = entry.days[dateKey]
          
          if (!dayData) return
          
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          
          const validation = this.validateCell({
            timeInterval: dayData.timeInterval || '',
            status: dayData.status,
            hours: dayData.hours || 0,
            notes: dayData.notes,
            absenceTypes,
            isWeekend
          })
          
          if (!validation.isValid) {
            if (validation.type === 'error') {
              errors.push({
                employeeId: entry.employeeId,
                employeeName: entry.employeeName,
                date: dateKey,
                error: validation.message
              })
            } else if (validation.type === 'warning') {
              warnings.push({
                employeeId: entry.employeeId,
                employeeName: entry.employeeName,
                date: dateKey,
                warning: validation.message
              })
            }
          }
        })
      })
    }
    
    return {
      isValid: errors.length === 0 && setupErrors.length === 0, // ✅ Setup errors also prevent saving
      errors,
      warnings,
      setupErrors
    }
  }

  /**
   * ✅ NEW: Validate grid setup requirements
   */
  private static validateGridSetup(context: GridValidationContext): ValidationResult {
    // Check if store is selected
    if (!context.storeId || context.storeId.trim() === '') {
      return {
        isValid: false,
        message: 'Store must be selected before creating timesheet',
        type: 'error'
      }
    }
    
    // Check if employees are selected
    if (!context.entries || context.entries.length === 0) {
      return {
        isValid: false,
        message: 'At least one employee must be selected',
        type: 'error'
      }
    }
    
    // Check if date range is valid
    const startDate = new Date(context.startDate)
    const endDate = new Date(context.endDate)
    
    if (startDate >= endDate) {
      return {
        isValid: false,
        message: 'End date must be after start date',
        type: 'error'
      }
    }
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 31) {
      return {
        isValid: false,
        message: 'Timesheet period cannot exceed 31 days',
        type: 'error'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Get suggested fixes for validation errors
   */
  static getSuggestedFix(
    context: CellValidationContext,
    error: string
  ): { action: string; description: string } | null {
    const { timeInterval, status, hours, absenceTypes } = context
    
    if (error.includes('Cannot have working hours with')) {
      return {
        action: 'clear_hours',
        description: 'Clear working hours to keep absence status'
      }
    }
    
    if (error.includes('requires working hours')) {
      return {
        action: 'add_hours',
        description: 'Add working hours or change to full-day absence'
      }
    }
    
    if (error.includes('Invalid time format')) {
      return {
        action: 'fix_format',
        description: 'Use format like "10-12" or "9:30-17:30"'
      }
    }
    
    return null
  }
}