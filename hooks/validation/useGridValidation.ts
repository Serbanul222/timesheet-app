// hooks/validation/useGridValidation.ts
'use client'

import { useMemo } from 'react'
import { TimesheetValidationRules } from '@/lib/validation/timesheetValidationRules'
import { useAbsenceTypes } from './useAbsenceTypes'
import { type TimesheetGridData } from '@/types/timesheet-grid'
import { generateDateRange } from '@/lib/timesheet-utils'

interface GridValidationResult {
  isValid: boolean
  errorCount: number
  warningCount: number
  setupErrorCount: number
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
  canSave: boolean
}

/**
 * Hook for validating entire timesheet grid
 */
export function useGridValidation(gridData: TimesheetGridData) {
  const { absenceTypes, isLoading } = useAbsenceTypes()
  
  const validationResult = useMemo((): GridValidationResult => {
    if (isLoading || !absenceTypes.length) {
      return {
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        setupErrorCount: 0,
        errors: [],
        warnings: [],
        setupErrors: [],
        canSave: false // Don't allow saving while loading
      }
    }
    
    const dateRange = generateDateRange(
      new Date(gridData.startDate),
      new Date(gridData.endDate)
    )
    
    // ✅ NEW: Include grid context for setup validation
    const gridContext = {
      storeId: gridData.storeId,
      zoneId: gridData.zoneId,
      entries: gridData.entries,
      startDate: gridData.startDate,
      endDate: gridData.endDate
    }
    
    const validation = TimesheetValidationRules.validateGrid(
      gridData.entries,
      dateRange,
      absenceTypes,
      gridContext
    )
    
    return {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      setupErrorCount: validation.setupErrors.length,
      errors: validation.errors,
      warnings: validation.warnings,
      setupErrors: validation.setupErrors,
      canSave: validation.isValid && !isLoading
    }
  }, [gridData, absenceTypes, isLoading])
  
  /**
   * Get validation summary message
   */
  const getValidationSummary = (): string => {
    if (validationResult.setupErrorCount > 0) {
      return 'Setup incomplete - select store and employees'
    }
    
    if (validationResult.isValid) {
      if (validationResult.warningCount > 0) {
        return `${validationResult.warningCount} warning${validationResult.warningCount !== 1 ? 's' : ''} (can still save)`
      }
      return 'All entries are valid'
    }
    
    const parts: string[] = []
    
    if (validationResult.errorCount > 0) {
      parts.push(`${validationResult.errorCount} error${validationResult.errorCount !== 1 ? 's' : ''}`)
    }
    
    if (validationResult.warningCount > 0) {
      parts.push(`${validationResult.warningCount} warning${validationResult.warningCount !== 1 ? 's' : ''}`)
    }
    
    return parts.join(', ')
  }

  /**
   * ✅ NEW: Get setup errors for display
   */
  const getSetupErrors = () => {
    return validationResult.setupErrors
  }

  /**
   * ✅ NEW: Check if grid has basic setup (store + employees)
   */
  const hasBasicSetup = () => {
    return validationResult.setupErrorCount === 0
  }
  
  /**
   * Get errors grouped by employee
   */
  const getErrorsByEmployee = () => {
    const grouped = new Map<string, Array<{
      date: string
      error: string
    }>>()
    
    validationResult.errors.forEach(error => {
      const key = `${error.employeeId}-${error.employeeName}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push({
        date: error.date,
        error: error.error
      })
    })
    
    return Array.from(grouped.entries()).map(([key, errors]) => {
      const [employeeId, employeeName] = key.split('-', 2)
      return {
        employeeId,
        employeeName,
        errors
      }
    })
  }
  
  /**
   * Get validation status for specific employee and date
   */
  const getCellValidationStatus = (employeeId: string, date: string) => {
    const error = validationResult.errors.find(
      e => e.employeeId === employeeId && e.date === date
    )
    
    const warning = validationResult.warnings.find(
      w => w.employeeId === employeeId && w.date === date
    )
    
    if (error) {
      return { type: 'error', message: error.error }
    }
    
    if (warning) {
      return { type: 'warning', message: warning.warning }
    }
    
    return { type: 'valid', message: null }
  }
  
  return {
    validationResult,
    getValidationSummary,
    getErrorsByEmployee,
    getCellValidationStatus,
    getSetupErrors,
    hasBasicSetup,
    isValidating: isLoading
  }
}