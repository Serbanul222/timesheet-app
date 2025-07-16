// hooks/validation/useCellValidation.ts
'use client'

import { useMemo } from 'react'
import { TimesheetValidationRules, type ValidationResult, type CellValidationContext } from '@/lib/validation/timesheetValidationRules'
import { useAbsenceTypes } from './useAbsenceTypes'
import { type DayStatus } from '@/types/timesheet-grid'

interface CellValidationProps {
  timeInterval: string
  status: DayStatus
  hours: number
  notes?: string
  isWeekend?: boolean
}

/**
 * Hook for real-time cell validation
 */
export function useCellValidation(props: CellValidationProps) {
  const { absenceTypes, isLoading } = useAbsenceTypes()
  
  // Memoize validation result for performance
  const validationResult = useMemo((): ValidationResult => {
    if (isLoading || !absenceTypes.length) {
      return { isValid: true } // Don't validate while loading
    }
    
    const context: CellValidationContext = {
      ...props,
      absenceTypes
    }
    
    return TimesheetValidationRules.validateCell(context)
  }, [props, absenceTypes, isLoading])
  
  /**
   * Get suggested fix for current validation state
   */
  const suggestedFix = useMemo(() => {
    if (validationResult.isValid || !validationResult.message) {
      return null
    }
    
    const context: CellValidationContext = {
      ...props,
      absenceTypes
    }
    
    return TimesheetValidationRules.getSuggestedFix(context, validationResult.message)
  }, [validationResult, props, absenceTypes])
  
  /**
   * Check if current combination would be valid
   */
  const wouldBeValid = (newTimeInterval: string, newStatus: DayStatus): boolean => {
    if (isLoading) return true
    
    const context: CellValidationContext = {
      ...props,
      timeInterval: newTimeInterval,
      status: newStatus,
      absenceTypes
    }
    
    return TimesheetValidationRules.validateCell(context).isValid
  }
  
  /**
   * Get all valid absence options for current time interval
   */
  const getValidAbsenceOptions = (): string[] => {
    if (isLoading) return []
    
    const hasHours = props.hours > 0 || (props.timeInterval && props.timeInterval.trim())
    
    if (hasHours) {
      // If has working hours, only allow 'alege' and partial-hours absences
      return [
        'alege',
        ...absenceTypes.filter(type => type.requires_hours).map(type => type.code)
      ]
    } else {
      // If no working hours, allow all absences (user can select first, then add hours)
      return [
        'alege',
        ...absenceTypes.map(type => type.code)
      ]
    }
  }
  
  /**
   * Check if time interval can be entered with current status
   */
  const canEnterTimeInterval = (timeInterval: string): boolean => {
    if (isLoading) return true
    
    // ✅ FIX: Always allow time interval input regardless of current status
    // The validation will catch conflicts but shouldn't prevent input
    return true
  }
  
  return {
    validationResult,
    suggestedFix,
    wouldBeValid,
    getValidAbsenceOptions,
    canEnterTimeInterval,
    isValidating: isLoading
  }
}