// lib/validation/timesheetValidationRules.ts
import { parseTimeInterval } from '@/lib/timesheet-utils' // ✅ FIXED: Use the correct import
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
  isDelegationRestricted?: boolean
  employeeId?: string
  cellDate?: string
}

export interface GridValidationContext {
  storeId?: string
  zoneId?: string
  entries: TimesheetEntry[]
  startDate: string
  endDate: string
}

export interface TimesheetEntry {
  employeeId: string
  employeeName: string
  days: Record<string, DayData>
}

export interface DayData {
  timeInterval?: string
  status: DayStatus
  hours?: number
  notes?: string
}

export interface ValidationError {
  employeeId: string
  employeeName: string
  date: string
  error: string
}

export interface ValidationWarning {
  employeeId: string
  employeeName: string
  date: string
  warning: string
}

export interface SetupError {
  field: string
  error: string
}

export interface SetupValidationResult {
  isValid: boolean
  message?: string
  type?: 'error' | 'warning' | 'info'
  field?: string
}

export interface SuggestedFix {
  action: string
  description: string
}

export interface GridValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  setupErrors: SetupError[]
}

/**
 * Core validation rules for timesheet cells and grids
 * 
 * Think of this like a comprehensive input validator in Java Spring Boot - 
 * it validates both individual fields and the entire form before submission.
 */
export class TimesheetValidationRules {
  
  /**
   * Validate a single cell with comprehensive rules including delegation
   * 
   * This is like validating a single form field - we run all applicable
   * validation rules and return the first failure or success.
   */
  static validateCell(context: CellValidationContext): ValidationResult {
    // Ensure we have valid context
    if (!context) {
      return {
        isValid: false,
        message: 'Validation context is required',
        type: 'error'
      }
    }

    const { 
      timeInterval, 
      status, 
      hours, 
      absenceTypes = [], 
      isWeekend = false, 
      isDelegationRestricted = false 
    } = context
    
    // Rule 0: Check delegation restrictions first (highest priority)
    if (isDelegationRestricted) {
      const delegationResult = this.validateDelegationRestriction(context)
      if (!delegationResult.isValid) {
        return delegationResult
      }
    }
    
    // Run all validation rules in order of importance
    const validationRules = [
      this.validateTimeFormat,
      this.validateHoursAbsenceConflict,
      this.validatePartialHours,
      this.validateStatusTransition,
      this.validateWeekendWork
    ]
    
    for (const rule of validationRules) {
      try {
        const result = rule(context)
        if (!result.isValid) {
          return result
        }
      } catch (error) {
        console.error('Validation rule error:', error)
        return {
          isValid: false,
          message: 'Internal validation error occurred',
          type: 'error'
        }
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 0: Validate delegation restrictions
   * 
   * Like checking permissions in a security layer - if user doesn't have
   * permission to edit, we block the action regardless of data validity.
   */
  private static validateDelegationRestriction(context: CellValidationContext): ValidationResult {
    const { timeInterval = '', hours = 0, status, isDelegationRestricted } = context
    
    if (!isDelegationRestricted) {
      return { isValid: true }
    }
    
    // Check for any new data entry attempts
    const hasNewTimeData = timeInterval.trim().length > 0
    const hasNewHours = hours > 0
    const hasNewStatus = status !== 'alege'
    
    // Prevent new working time entries
    if (hasNewTimeData || hasNewHours) {
      return {
        isValid: false,
        message: 'Cannot edit timesheet after employee delegation date',
        type: 'error'
      }
    }
    
    // Allow status changes to absences but not combined with working hours
    if (hasNewStatus && (hasNewTimeData || hasNewHours)) {
      return {
        isValid: false,
        message: 'Cannot add working hours after delegation date',
        type: 'error'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 1: Validate time format and constraints
   * 
   * Like validating email format - we check both syntax and business rules.
   */
  private static validateTimeFormat(context: CellValidationContext): ValidationResult {
    const { timeInterval = '' } = context
    
    // Empty time interval is valid (no work scheduled)
    if (!timeInterval.trim()) {
      return { isValid: true }
    }
    
    try {
      const hoursWorked = parseTimeInterval(timeInterval)
      
      // parseTimeInterval returns 0 for invalid formats
      if (hoursWorked === 0 && timeInterval.trim() !== '') {
        return {
          isValid: false,
          message: 'Invalid time format. Use "10-12" or "9:30-17:30"',
          type: 'error'
        }
      }
      
      // Business rule: Maximum 16 hours per shift
      if (hoursWorked > 16) {
        return {
          isValid: false,
          message: 'Shift cannot exceed 16 hours',
          type: 'error'
        }
      }
      
      // Business rule: Minimum 30 minutes per shift
      if (hoursWorked < 0.5 && hoursWorked > 0) {
        return {
          isValid: false,
          message: 'Shift must be at least 30 minutes',
          type: 'error'
        }
      }
      
      return { isValid: true }
      
    } catch (error) {
      return {
        isValid: false,
        message: 'Failed to parse time interval',
        type: 'error'
      }
    }
  }

  /**
   * Rule 2: Validate hours vs absence conflict
   * 
   * Like validating mutually exclusive checkboxes - you can't be both 
   * working and on full-day absence at the same time.
   */
  private static validateHoursAbsenceConflict(context: CellValidationContext): ValidationResult {
    const { timeInterval = '', status, hours = 0, absenceTypes = [] } = context
    
    const hasWorkingHours = hours > 0 || timeInterval.trim().length > 0
    const absenceType = absenceTypes.find(type => type.code === status)
    const isFullDayAbsence = absenceType && !absenceType.requires_hours
    
    // Case 1: Working hours + full-day absence = CONFLICT
    if (hasWorkingHours && isFullDayAbsence) {
      return {
        isValid: false,
        message: `Cannot have working hours with ${absenceType.name}`,
        type: 'error'
      }
    }
    
    // Case 2: Partial-hours absence without hours = WARNING
    if (!hasWorkingHours && absenceType && absenceType.requires_hours && status !== 'alege') {
      return {
        isValid: false,
        message: `${absenceType.name} requires working hours to be specified`,
        type: 'warning'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 3: Validate partial hours absences
   * 
   * Like validating conditional required fields - if you select "partial day off",
   * then hours become required and must be within reasonable limits.
   */
  private static validatePartialHours(context: CellValidationContext): ValidationResult {
    const { status, hours = 0, absenceTypes = [] } = context
    
    const absenceType = absenceTypes.find(type => type.code === status)
    
    if (!absenceType || !absenceType.requires_hours) {
      return { isValid: true }
    }
    
    // Partial absence requires hours
    if (hours <= 0) {
      return {
        isValid: false,
        message: `${absenceType.name} requires working hours`,
        type: 'error'
      }
    }
    
    // Business rule: Partial absence cannot exceed normal work day
    if (hours > 8) {
      return {
        isValid: false,
        message: `${absenceType.name} cannot exceed 8 hours`,
        type: 'warning'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 4: Validate status transitions
   * 
   * Like validating enum values - ensure the selected status is one of 
   * the allowed values in our system.
   */
  private static validateStatusTransition(context: CellValidationContext): ValidationResult {
    const { status, absenceTypes = [] } = context
    
    // 'alege' is always valid (means "choose/select")
    if (status === 'alege') {
      return { isValid: true }
    }
    
    // ✅ ENHANCED: Better handling of loading states
    if (absenceTypes.length === 0) {
      // Don't block validation if absence types haven't loaded yet
      // This prevents the "Invalid status: undefined" error
      console.warn('Absence types not loaded yet, allowing status:', status)
      return { 
        isValid: true,
        message: 'Loading absence types...',
        type: 'info'
      }
    }
    
    // Check if status exists in available absence types
    const isValidStatus = absenceTypes.some(type => type.code === status)
    
    if (!isValidStatus) {
      const availableCodes = absenceTypes.map(t => t.code).join(', ')
      console.error('Invalid status validation:', {
        status,
        availableTypes: availableCodes,
        absenceTypesLength: absenceTypes.length
      })
      
      return {
        isValid: false,
        message: `Invalid status: ${status}. Available: ${availableCodes || 'none loaded'}`,
        type: 'error'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Rule 5: Validate weekend work (informational only)
   * 
   * Like a soft validation warning - we allow it but inform the user
   * that it's unusual.
   */
  private static validateWeekendWork(context: CellValidationContext): ValidationResult {
    const { hours = 0, isWeekend = false } = context
    
    if (isWeekend && hours > 0) {
      return {
        isValid: true, // Valid but with info message
        message: 'Weekend work detected',
        type: 'info'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Validate entire timesheet grid including setup requirements
   * 
   * Like validating an entire form submission - we check both setup
   * requirements and individual field validations.
   */
  static validateGrid(
    entries: TimesheetEntry[],
    dateRange: Date[],
    absenceTypes: AbsenceType[],
    gridContext?: GridValidationContext
  ): GridValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    const setupErrors: SetupError[] = []
    
    try {
      // First validate grid setup requirements
      if (gridContext) {
        const setupValidation = this.validateGridSetup(gridContext)
        if (!setupValidation.isValid) {
          setupErrors.push({
            field: setupValidation.field || 'general',
            error: setupValidation.message || 'Setup validation failed'
          })
        }
      }
      
      // Only validate individual cells if setup is correct
      if (setupErrors.length === 0) {
        this.validateGridCells(entries, dateRange, absenceTypes, errors, warnings)
      }
      
      return {
        isValid: errors.length === 0 && setupErrors.length === 0,
        errors,
        warnings,
        setupErrors
      }
      
    } catch (error) {
      console.error('Grid validation error:', error)
      return {
        isValid: false,
        errors: [{
          employeeId: 'system',
          employeeName: 'System Error',
          date: 'N/A',
          error: 'Internal validation error occurred'
        }],
        warnings: [],
        setupErrors: []
      }
    }
  }

  /**
   * Validate all cells in the grid
   */
  private static validateGridCells(
    entries: TimesheetEntry[],
    dateRange: Date[],
    absenceTypes: AbsenceType[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    entries.forEach(entry => {
      if (!entry.days) {
        return // Skip entries without day data
      }
      
      dateRange.forEach(date => {
        const dateKey = date.toISOString().split('T')[0]
        const dayData = entry.days[dateKey]
        
        if (!dayData) {
          return // Skip dates without data
        }
        
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        
        const validationContext: CellValidationContext = {
          timeInterval: dayData.timeInterval || '',
          status: dayData.status,
          hours: dayData.hours || 0,
          notes: dayData.notes,
          absenceTypes,
          isWeekend,
          employeeId: entry.employeeId,
          cellDate: dateKey
        }
        
        const validation = this.validateCell(validationContext)
        
        if (!validation.isValid && validation.message) {
          const errorInfo = {
            employeeId: entry.employeeId,
            employeeName: entry.employeeName,
            date: dateKey
          }
          
          if (validation.type === 'error') {
            errors.push({
              ...errorInfo,
              error: validation.message
            })
          } else if (validation.type === 'warning') {
            warnings.push({
              ...errorInfo,
              warning: validation.message
            })
          }
        }
      })
    })
  }

  /**
   * Validate grid setup requirements
   * 
   * Like validating form prerequisites - ensure all required setup
   * is completed before allowing data entry.
   */
  private static validateGridSetup(context: GridValidationContext): SetupValidationResult {
    // Validate store selection
    if (!context.storeId || context.storeId.trim() === '') {
      return {
        isValid: false,
        message: 'Magazinul trebuie selectat înainte de a crea pontajul',
        type: 'error',
        field: 'store'
      }
    }
    
    // Validate employee selection
    if (!context.entries || context.entries.length === 0) {
      return {
        isValid: false,
        message: 'Cel puțin un angajat trebuie selectat',
        type: 'error',
        field: 'employees'
      }
    }
    
    // Validate date range
    const startDate = new Date(context.startDate)
    const endDate = new Date(context.endDate)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        isValid: false,
        message: 'Invalid date format',
        type: 'error',
        field: 'dateRange'
      }
    }
    
    if (startDate >= endDate) {
      return {
        isValid: false,
        message: 'End date must be after start date',
        type: 'error',
        field: 'dateRange'
      }
    }
    
    // Business rule: Maximum 31 days per timesheet
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff > 31) {
      return {
        isValid: false,
        message: 'Timesheet period cannot exceed 31 days',
        type: 'error',
        field: 'dateRange'
      }
    }
    
    return { isValid: true }
  }

  /**
   * Get suggested fixes for validation errors
   * 
   * Like providing autocorrect suggestions - help users understand
   * how to fix their validation errors.
   */
  static getSuggestedFix(
    context: CellValidationContext,
    error: string
  ): SuggestedFix | null {
    try {
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
      
      if (error.includes('delegation date')) {
        return {
          action: 'contact_admin',
          description: 'Contact administrator to modify timesheet after delegation'
        }
      }
      
      if (error.includes('exceed 16 hours')) {
        return {
          action: 'reduce_hours',
          description: 'Reduce shift duration to maximum 16 hours'
        }
      }
      
      return null
      
    } catch (error) {
      console.error('Error generating suggested fix:', error)
      return null
    }
  }

  /**
   * Utility method to check if a specific validation rule would pass
   * 
   * Useful for UI to show real-time validation feedback
   */
  static checkSpecificRule(
    ruleName: string,
    context: CellValidationContext
  ): ValidationResult {
    try {
      switch (ruleName) {
        case 'timeFormat':
          return this.validateTimeFormat(context)
        case 'hoursAbsence':
          return this.validateHoursAbsenceConflict(context)
        case 'partialHours':
          return this.validatePartialHours(context)
        case 'statusTransition':
          return this.validateStatusTransition(context)
        case 'weekendWork':
          return this.validateWeekendWork(context)
        case 'delegation':
          return this.validateDelegationRestriction(context)
        default:
          return {
            isValid: false,
            message: `Unknown validation rule: ${ruleName}`,
            type: 'error'
          }
      }
    } catch (error) {
      return {
        isValid: false,
        message: 'Error checking validation rule',
        type: 'error'
      }
    }
  }
}