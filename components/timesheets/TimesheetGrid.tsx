// components/timesheets/TimesheetGrid.tsx
'use client'

import { useMemo, useCallback, useState } from 'react'
import { TimesheetGridHeader } from './TimesheetGridHeader'
import { TimesheetGridRow } from './TimesheetGridRow'
import { TimesheetGridFooter } from './TimesheetGridFooter'
import { SaveStatusDisplay } from './SaveStatusDisplay'
import { type TimesheetGridData, type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, calculateTotalHours } from '@/lib/timesheet-utils'
import { useTimesheetSave } from '@/hooks/timesheet/useTimesheetSave'
import { useGridValidation } from '@/hooks/validation/useGridValidation'
import { TimesheetCreator } from './TimesheetCreator' // Import the creator

const parseTimeInterval = (interval: string): { startTime: string; endTime: string; hours: number } | null => {
  if (!interval || !interval.trim()) return null
  const regex = /^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/
  const match = interval.trim().match(regex)
  if (!match) return null
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
  const hours = diffMinutes / 60
  return { startTime, endTime, hours: Math.round(hours * 100) / 100 }
}

interface TimesheetGridProps {
  data: TimesheetGridData | null // Data can be null for creation
  onDataChange: (newData: TimesheetGridData | null) => void // Allow null
  onCancel: () => void
  readOnly?: boolean
  className?: string
}

export function TimesheetGrid({
  data,
  onDataChange,
  onCancel,
  readOnly = false,
  className = ''
}: TimesheetGridProps) {
  
  // ✅ CORRECTED: If data is null, render the creator component.
  // This prevents the rest of the component from crashing while preserving all original logic.
  if (!data) {
    return <TimesheetCreator onGridCreate={onDataChange} onCancel={onCancel} />;
  }

  // --- ALL ORIGINAL LOGIC IS PRESERVED BELOW ---

  const { startDate, endDate, entries } = data
  
  const dateRange = useMemo(() => {
    return generateDateRange(new Date(startDate), new Date(endDate))
  }, [startDate, endDate])

  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null)

  // Grid validation with setup validation
  const { 
    validationResult, 
    getValidationSummary, 
    getErrorsByEmployee, 
    getSetupErrors, 
    hasBasicSetup, 
    isValidating 
  } = useGridValidation(data)

  // Timesheet save hook
  const { 
    saveTimesheet, 
    isSaving, 
    lastSaveResult, 
    clearLastResult,
    canSave: canSaveService,
  } = useTimesheetSave({
    gridId: data.id,
    onSuccess: (result) => {
      console.log('Grid save successful:', {
        sessionId: result.sessionId,
        created: result.savedTimesheets.filter(t => !t.isUpdate).length,
        updated: result.savedTimesheets.filter(t => t.isUpdate).length
      })
    },
    onPartialSuccess: (result) => {
      console.log('Grid save partially successful:', result)
    }
  })

  // Combined save capability
  const canSave = canSaveService && validationResult.canSave && !isValidating

  const updateCell = useCallback((
    employeeId: string, 
    date: string, 
    field: 'timeInterval' | 'status' | 'notes', 
    value: string | DayStatus
  ) => {
    if (readOnly) return

    const newEntries = data.entries.map(entry => {
      if (entry.employeeId !== employeeId) {
        return entry
      }

      const newDays = { ...entry.days }
      const currentDay = newDays[date] || {}
      const updatedDay = { ...currentDay }
      
      if (field === 'timeInterval') {
        const parsed = parseTimeInterval(value as string)
        if (parsed) {
          updatedDay.timeInterval = value as string
          updatedDay.startTime = parsed.startTime
          updatedDay.endTime = parsed.endTime
          updatedDay.hours = parsed.hours
        } else {
          updatedDay.timeInterval = value as string
          updatedDay.startTime = ''
          updatedDay.endTime = ''
          updatedDay.hours = 0
        }
      } else {
        (updatedDay as any)[field] = value
      }
      
      newDays[date] = updatedDay
      return { ...entry, days: newDays }
    })

    onDataChange({
      ...data,
      entries: newEntries,
      updatedAt: new Date().toISOString()
    })
  }, [readOnly, data, onDataChange])

  const employeeTotals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc[entry.employeeId] = calculateTotalHours(entry.days)
      return acc
    }, {} as Record<string, number>)
  }, [entries])

  const dailyTotals = useMemo(() => {
    return dateRange.reduce((acc, date) => {
      const dateKey = date.toISOString().split('T')[0]
      acc[dateKey] = entries.reduce((sum, entry) => sum + (entry.days[dateKey]?.hours || 0), 0)
      return acc
    }, {} as Record<string, number>)
  }, [entries, dateRange])

  const handleSave = async () => {
    if (readOnly || !canSave) return

    if (!validationResult.isValid) {
      console.warn('Cannot save: Validation errors present')
      return
    }

    try {
      const enrichedData = {
        ...data,
        storeId: data.storeId || undefined,
        zoneId: data.zoneId || undefined
      }
      
      await saveTimesheet(enrichedData)
    } catch (error) {
      console.error('Grid save failed:', error)
    }
  }

  const handleCellSelect = (employeeId: string, date: string) => {
    setSelectedCell({ employeeId, date })
  }

  return (
    <div className={`timesheet-grid bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Setup Errors Display */}
      {validationResult.setupErrorCount > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Complete Setup to View Timesheet
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                {getSetupErrors().map((error, index) => (
                  <p key={index}>• {error.error}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors Display */}
      {hasBasicSetup() && (!validationResult.isValid || validationResult.warningCount > 0) && (
        <div className="p-4 border-b border-gray-200">
          
          {/* Show Errors (prevent saving) */}
          {!validationResult.isValid && (
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Validation Errors Prevent Saving
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {validationResult.errorCount} error{validationResult.errorCount !== 1 ? 's' : ''} must be fixed before saving
                </p>
                
                {getErrorsByEmployee().length > 0 && (
                  <div className="mt-3 space-y-2">
                    {getErrorsByEmployee().map(({ employeeId, employeeName, errors }) => (
                      <div key={employeeId} className="bg-red-50 rounded-md p-3">
                        <h4 className="text-sm font-medium text-red-800">
                          {employeeName}
                        </h4>
                        <ul className="mt-1 text-sm text-red-700 space-y-1">
                          {errors.map((error, index) => (
                            <li key={index} className="flex items-start">
                              <span className="font-mono text-xs mr-2">
                                {new Date(error.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}:
                              </span>
                              <span>{error.error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Show Warnings (can still save) */}
          {validationResult.warningCount > 0 && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Warnings (Can Still Save)
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {validationResult.warningCount} warning{validationResult.warningCount !== 1 ? 's' : ''} - you can save but should review these entries
                </p>
                
                {validationResult.warnings.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {validationResult.warnings.map((warning, index) => (
                      <div key={index} className="bg-yellow-50 rounded-md p-3">
                        <div className="flex items-start">
                          <span className="font-mono text-xs mr-2 text-yellow-600">
                            {new Date(warning.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}:
                          </span>
                          <span className="text-sm text-yellow-800">
                            <strong>{warning.employeeName}</strong> - {warning.warning}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Status Display */}
      {lastSaveResult && (
        <div className="p-4 border-b border-gray-200">
          <SaveStatusDisplay 
            result={lastSaveResult}
            onDismiss={clearLastResult}
          />
        </div>
      )}

      {/* Grid Content or Setup Message */}
      {data.entries.length > 0 && hasBasicSetup() ? (
        <>
          <div className="overflow-x-auto overflow-y-visible">
            <div style={{ minWidth: 'max-content' }}>
              <TimesheetGridHeader
                dateRange={dateRange}
                dailyTotals={dailyTotals}
              />
              <div className="timesheet-grid-body">
                {data.entries.map((entry) => (
                  <TimesheetGridRow
                    key={entry.employeeId}
                    entry={entry}
                    dateRange={dateRange}
                    totalHours={employeeTotals[entry.employeeId]}
                    selectedCell={selectedCell}
                    readOnly={readOnly}
                    onCellSelect={handleCellSelect}
                    onUpdateCell={updateCell}
                  />
                ))}
              </div>
            </div>
          </div>
          <TimesheetGridFooter
            totalHours={Object.values(employeeTotals).reduce((sum, hours) => sum + hours, 0)}
            employeeCount={data.entries.length}
            onSave={handleSave}
            onCancel={onCancel}
            isSaving={isSaving}
            readOnly={readOnly}
            canSave={canSave}
            validationSummary={getValidationSummary()}
            hasValidationErrors={!validationResult.isValid && hasBasicSetup()}
            hasSetupErrors={!hasBasicSetup()}
          />
        </>
      ) : (
        <div className="p-8 text-center">
          {!hasBasicSetup() ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2 0H3m2-2v-2m0-4v-2m0-4V9m0-4V3" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Required</h3>
              <p className="text-gray-600 mb-4">
                Please complete the setup above to create your timesheet grid.
              </p>
              <div className="bg-blue-50 rounded-lg p-4 max-w-md mx-auto">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">Required steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Select a store from the dropdown</li>
                    <li>Choose employees for the timesheet</li>
                    <li>Set the date range for the period</li>
                  </ol>
                </div>
              </div>
            </>
          ) : (
            <>
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Selected</h3>
              <p className="text-gray-600">Select employees from the controls above to start creating timesheets</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default TimesheetGrid
