// hooks/validation/useCellValidation.ts - ENHANCED: Added delegation date validation
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
  // ✅ NEW: Delegation context for validation
  employeeId?: string
  cellDate?: string
  delegations?: Array<{
    employee_id: string
    valid_from: string
    to_store_id: string
    from_store_id: string
  }>
}

/**
 * Hook for real-time cell validation with delegation date support
 */
export function useCellValidation(props: CellValidationProps) {
  const { absenceTypes, isLoading } = useAbsenceTypes()
  
  // ✅ NEW: Check if cell is after delegation start date
  const isDelegationRestricted = useMemo(() => {
    if (!props.employeeId || !props.cellDate || !props.delegations) {
      return false
    }

    const cellDate = new Date(props.cellDate)
    
    // Find active delegation for this employee
    const delegation = props.delegations.find(d => d.employee_id === props.employeeId)
    if (!delegation) return false

    const delegationStartDate = new Date(delegation.valid_from)
    
    // Cell is restricted if it's on or after the delegation start date
    return cellDate >= delegationStartDate
  }, [props.employeeId, props.cellDate, props.delegations])

  // ✅ NEW: Enhanced context with delegation info
  const enhancedContext: CellValidationContext = {
    ...props,
    absenceTypes,
    isDelegationRestricted // Add delegation context
  }
  
  // Memoize validation result for performance
  const validationResult = useMemo((): ValidationResult => {
    if (isLoading || !absenceTypes.length) {
      return { isValid: true } // Don't validate while loading
    }
    
    return TimesheetValidationRules.validateCell(enhancedContext)
  }, [enhancedContext, absenceTypes, isLoading])
  
  // Get suggested fix for current validation state
  const suggestedFix = useMemo(() => {
    if (validationResult.isValid || !validationResult.message) {
      return null
    }
    
    return TimesheetValidationRules.getSuggestedFix(enhancedContext, validationResult.message)
  }, [validationResult, enhancedContext])
  
  // Check if current combination would be valid
  const wouldBeValid = (newTimeInterval: string, newStatus: DayStatus): boolean => {
    if (isLoading) return true
    
    const testContext: CellValidationContext = {
      ...enhancedContext,
      timeInterval: newTimeInterval,
      status: newStatus,
    }
    
    return TimesheetValidationRules.validateCell(testContext).isValid
  }
  
  // Get all valid absence options for current time interval
  const getValidAbsenceOptions = (): string[] => {
    if (isLoading) return []
    
    const hasHours = props.hours > 0 || (props.timeInterval && props.timeInterval.trim())
    
    if (hasHours) {
      return [
        'alege',
        ...absenceTypes.filter(type => type.requires_hours).map(type => type.code)
      ]
    } else {
      return [
        'alege',
        ...absenceTypes.map(type => type.code)
      ]
    }
  }
  
  // ✅ NEW: Check if time interval can be entered (considering delegation)
  const canEnterTimeInterval = (): boolean => {
    if (isLoading) return true
    
    // If cell is delegation-restricted, don't allow new time entries
    if (isDelegationRestricted) {
      return false
    }
    
    return true
  }
  
  return {
    validationResult,
    suggestedFix,
    wouldBeValid,
    getValidAbsenceOptions,
    canEnterTimeInterval,
    isValidating: isLoading,
    isDelegationRestricted // ✅ NEW: Expose delegation restriction status
  }
}