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

export class TimesheetValidationRules {
  
  static validateCell(context: CellValidationContext): ValidationResult {
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
    
    if (isDelegationRestricted) {
      const delegationResult = this.validateDelegationRestriction(context)
      if (!delegationResult.isValid) {
        return delegationResult
      }
    }
    
    const validationRules = [
      this.validateTimeFormat,
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

  private static validateDelegationRestriction(context: CellValidationContext): ValidationResult {
    const { isDelegationRestricted } = context
    const safeTimeInterval = String(context.timeInterval || '').trim()
    
    if (!isDelegationRestricted) {
      return { isValid: true }
    }
    
    const hasNewTimeData = safeTimeInterval.length > 0
    const hasNewHours = (context.hours || 0) > 0
    const hasNewStatus = context.status !== 'alege'
    
    if (hasNewTimeData || hasNewHours) {
      return {
        isValid: false,
        message: 'Cannot edit timesheet after employee delegation date',
        type: 'error'
      }
    }
    
    if (hasNewStatus && (hasNewTimeData || hasNewHours)) {
      return {
        isValid: false,
        message: 'Cannot add working hours after delegation date',
        type: 'error'
      }
    }
    
    return { isValid: true }
  }

  private static validateTimeFormat(context: CellValidationContext): ValidationResult {
    const safeTimeInterval = String(context?.timeInterval || '').trim()
    
    if (!safeTimeInterval) {
      return { isValid: true }
    }
    
    try {
      const hoursWorked = parseTimeInterval(safeTimeInterval)
      
      if (hoursWorked === 0 && safeTimeInterval !== '') {
        return {
          isValid: false,
          message: 'Invalid time format. Use "10-12" or "9:30-17:30"',
          type: 'error'
        }
      }
      
      if (hoursWorked > 16) {
        return {
          isValid: false,
          message: 'Shift cannot exceed 16 hours',
          type: 'error'
        }
      }
      
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

  // NEW RULE: Validate full-day absence integrity (replaces old conflict rule)


  private static validatePartialHours(context: CellValidationContext): ValidationResult {
    const { status, hours = 0, absenceTypes = [] } = context
    
    const absenceType = absenceTypes.find(type => type.code === status)
    
    if (!absenceType || !absenceType.requires_hours) {
      return { isValid: true }
    }
    
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
    
    return { isValid: true }
  }

  private static validateStatusTransition(context: CellValidationContext): ValidationResult {
    const { status, absenceTypes = [] } = context
    
    if (status === 'alege') {
      return { isValid: true }
    }
    
    if (absenceTypes.length === 0) {
      console.warn('Absence types not loaded yet, allowing status:', status)
      return { 
        isValid: true,
        message: 'Loading absence types...',
        type: 'info'
      }
    }
    
    const isValidStatus = absenceTypes.some(type => type.code === status)
    
    if (!isValidStatus) {
      const availableCodes = absenceTypes.map(t => t.code).join(', ')
      return {
        isValid: false,
        message: `Invalid status: ${status}. Available: ${availableCodes || 'none loaded'}`,
        type: 'error'
      }
    }
    
    return { isValid: true }
  }

  private static validateWeekendWork(context: CellValidationContext): ValidationResult {
    const { hours = 0, isWeekend = false } = context
    
    if (isWeekend && hours > 0) {
      return {
        isValid: true,
        message: 'Weekend work detected',
        type: 'info'
      }
    }
    
    return { isValid: true }
  }

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
      if (gridContext) {
        const setupValidation = this.validateGridSetup(gridContext)
        if (!setupValidation.isValid) {
          setupErrors.push({
            field: setupValidation.field || 'general',
            error: setupValidation.message || 'Setup validation failed'
          })
        }
      }
      
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

  private static validateGridCells(
    entries: TimesheetEntry[],
    dateRange: Date[],
    absenceTypes: AbsenceType[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    entries.forEach(entry => {
      if (!entry.days) return
      
      dateRange.forEach(date => {
        const dateKey = date.toISOString().split('T')[0]
        const dayData = entry.days[dateKey]
        
        if (!dayData) return
        
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

  private static validateGridSetup(context: GridValidationContext): SetupValidationResult {
    if (!context.storeId || context.storeId.trim() === '') {
      return {
        isValid: false,
        message: 'Magazinul trebuie selectat înainte de a crea pontajul',
        type: 'error',
        field: 'store'
      }
    }
    
    if (!context.entries || context.entries.length === 0) {
      return {
        isValid: false,
        message: 'Cel puțin un angajat trebuie selectat',
        type: 'error',
        field: 'employees'
      }
    }
    
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

  static getSuggestedFix(
    context: CellValidationContext,
    error: string
  ): SuggestedFix | null {
    try {
      if (error.includes('Full-day absence should not have time intervals')) {
        return {
          action: 'clear_time_interval',
          description: 'Clear time interval to keep full-day absence'
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
      
      return null
      
    } catch (error) {
      console.error('Error generating suggested fix:', error)
      return null
    }
  }

  static checkSpecificRule(
    ruleName: string,
    context: CellValidationContext
  ): ValidationResult {
    try {
      switch (ruleName) {
        case 'timeFormat':
          return this.validateTimeFormat(context)
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