// hooks/validation/useCellValidation.ts - FIXED: Proper TypeScript types and validation logic
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
  // ✅ FIXED: Delegation context for validation
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
 * 
 * Think of this like a real-time form validator in Java Spring Boot - 
 * it checks business rules as the user types and provides immediate feedback.
 */
export function useCellValidation(props: CellValidationProps) {
  const { absenceTypes, isLoading } = useAbsenceTypes()
 
  // ✅ FIXED: Check if cell is after delegation start date
  const isDelegationRestricted = useMemo(() => {
    if (!props.employeeId || !props.cellDate || !props.delegations?.length) {
      return false
    }
    
    try {
      const cellDate = new Date(props.cellDate)
      
      // Find active delegation for this employee
      const delegation = props.delegations.find(d => d.employee_id === props.employeeId)
      if (!delegation) return false
      
      const delegationStartDate = new Date(delegation.valid_from)
      
      // Cell is restricted if it's on or after the delegation start date
      return cellDate >= delegationStartDate
    } catch (error) {
      console.error('Error checking delegation restriction:', error)
      return false
    }
  }, [props.employeeId, props.cellDate, props.delegations])

  // ✅ FIXED: Create proper validation context with all required fields
  const validationContext: CellValidationContext = useMemo(() => ({
    timeInterval: props.timeInterval || '',
    status: props.status,
    hours: props.hours || 0,
    notes: props.notes,
    absenceTypes: absenceTypes || [], // ✅ FIXED: Include absenceTypes from hook
    isWeekend: props.isWeekend || false,
    isDelegationRestricted,
    employeeId: props.employeeId,
    cellDate: props.cellDate
  }), [
    props.timeInterval,
    props.status, 
    props.hours,
    props.notes,
    props.isWeekend,
    props.employeeId,
    props.cellDate,
    absenceTypes,
    isDelegationRestricted
  ])
 
  // ✅ FIXED: Memoize validation result for performance
  const validationResult = useMemo((): ValidationResult => {
    // Don't validate while absence types are loading
    if (isLoading) {
      return { 
        isValid: true, 
        message: 'Loading validation rules...',
        type: 'info'
      }
    }

    // If no absence types loaded, skip status validation but allow other validation
    if (!absenceTypes?.length) {
      console.warn('No absence types available for validation')
      return { 
        isValid: true,
        message: 'Absence types not loaded',
        type: 'warning'
      }
    }
   
    try {
      return TimesheetValidationRules.validateCell(validationContext)
    } catch (error) {
      console.error('Cell validation error:', error)
      return {
        isValid: false,
        message: 'Validation error occurred',
        type: 'error'
      }
    }
  }, [validationContext, absenceTypes, isLoading])
 
  // ✅ FIXED: Get suggested fix for current validation state
  const suggestedFix = useMemo(() => {
    if (validationResult.isValid || !validationResult.message) {
      return null
    }
   
    try {
      return TimesheetValidationRules.getSuggestedFix(validationContext, validationResult.message)
    } catch (error) {
      console.error('Error getting suggested fix:', error)
      return null
    }
  }, [validationResult, validationContext])
 
  // ✅ ENHANCED: Check if a hypothetical combination would be valid
  const wouldBeValid = (newTimeInterval: string, newStatus: DayStatus): boolean => {
    if (isLoading || !absenceTypes?.length) return true
   
    const testContext: CellValidationContext = {
      ...validationContext,
      timeInterval: newTimeInterval,
      status: newStatus,
    }
   
    try {
      return TimesheetValidationRules.validateCell(testContext).isValid
    } catch (error) {
      console.error('Error testing validation:', error)
      return false
    }
  }
 
  // ✅ ENHANCED: Get all valid absence options for current time interval
  const getValidAbsenceOptions = (): string[] => {
    if (isLoading || !absenceTypes?.length) return ['alege']
   
    try {
      const hasHours = (props.hours || 0) > 0 || (props.timeInterval && props.timeInterval.trim().length > 0)
   
      if (hasHours) {
        // If there are working hours, only allow absences that support partial hours
        return [
          'alege',
          ...absenceTypes.filter(type => type.requires_hours).map(type => type.code)
        ]
      } else {
        // If no working hours, allow all absence types
        return [
          'alege',
          ...absenceTypes.map(type => type.code)
        ]
      }
    } catch (error) {
      console.error('Error getting valid absence options:', error)
      return ['alege']
    }
  }
 
  // ✅ FIXED: Check if time interval can be entered (considering delegation)
  const canEnterTimeInterval = (): boolean => {
    // Allow input while loading
    if (isLoading) return true
   
    // Block input if delegation restricted
    if (isDelegationRestricted) {
      return false
    }
   
    // Allow input otherwise
    return true
  }

  // ✅ ENHANCED: Check if status can be changed
  const canChangeStatus = (): boolean => {
    if (isLoading) return true
    
    // Allow status changes even with delegation (user might want to mark as absence)
    // but the validation will catch conflicts
    return true
  }

  // ✅ NEW: Get validation summary for debugging
  const getValidationSummary = () => ({
    isValid: validationResult.isValid,
    message: validationResult.message,
    type: validationResult.type,
    isDelegationRestricted,
    canEnterTime: canEnterTimeInterval(),
    canChangeStatus: canChangeStatus(),
    absenceTypesLoaded: !isLoading && absenceTypes?.length > 0,
    context: validationContext
  })
 
  return {
    validationResult,
    suggestedFix,
    wouldBeValid,
    getValidAbsenceOptions,
    canEnterTimeInterval: canEnterTimeInterval(), // ✅ FIXED: Call the function
    canChangeStatus: canChangeStatus(),
    isValidating: isLoading,
    isDelegationRestricted,
    getValidationSummary // ✅ NEW: For debugging
  }
}