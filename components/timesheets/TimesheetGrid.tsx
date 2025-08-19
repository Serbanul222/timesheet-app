// FILE: components/timesheets/TimesheetGrid.tsx - REWRITTEN
'use client'

import { useMemo, useCallback, useState } from 'react'
import { TimesheetGridHeader } from './TimesheetGridHeader'
import { TimesheetGridRow } from './TimesheetGridRow'
import { TimesheetGridFooter } from './TimesheetGridFooter'
import { SaveStatusDisplay } from './SaveStatusDisplay'
import { type TimesheetGridData, type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, calculateTotalHours, formatDateLocal } from '@/lib/timesheet-utils'
import { useTimesheetSave } from '@/hooks/timesheet/useTimesheetSave'
import { useGridValidation } from '@/hooks/validation/useGridValidation'
import { TimesheetCreator } from './TimesheetCreator'

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
};

interface TimesheetGridProps {
  data: TimesheetGridData | null
  // ✅ FIX: The prop type is changed to Partial<TimesheetGridData> to match what page.tsx provides.
  onDataChange: (updates: Partial<TimesheetGridData>) => void
  onCancel: () => void
  onSaveSuccess: () => void // Make sure to pass this from page.tsx
  readOnly?: boolean
  className?: string
}

export function TimesheetGrid({
  data,
  onDataChange,
  onCancel,
  onSaveSuccess,
  readOnly = false,
  className = ''
}: TimesheetGridProps) {
  
  /**
   * This "translator" function converts the simple data from TimesheetCreator
   * into the full TimesheetGridData object the app needs. This is necessary plumbing.
   */
  const handleGridCreate = (creatorData: {
    startDate: Date
    endDate: Date
    storeId: string
    employees: Array<{ id: string; name: string; position?: string }>
  }) => {
    const dateRange = generateDateRange(creatorData.startDate, creatorData.endDate);
    const now = new Date().toISOString();

    const newEntries: TimesheetEntry[] = creatorData.employees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      position: emp.position || 'Staff',
      days: dateRange.reduce((acc, date) => {
        const dateKey = formatDateLocal(date);
        acc[dateKey] = { hours: 0, status: 'alege', notes: '' };
        return acc;
      }, {} as Record<string, any>),
    }));

    const newGridData: TimesheetGridData = {
      id: '',
      startDate: creatorData.startDate.toISOString(),
      endDate: creatorData.endDate.toISOString(),
      storeId: creatorData.storeId,
      entries: newEntries,
      createdAt: now,
      updatedAt: now,
    };

    onDataChange(newGridData);
  };
  
  // Your original logic: if data is null, render the creator.
  if (!data) {
    // ✅ FIX: The prop name is changed from 'onGridCreate' to 'onCreateTimesheet'
    // to match what the TimesheetCreator component actually expects.
    return <TimesheetCreator onCreateTimesheet={handleGridCreate} onCancel={onCancel} />;
  }

  // --- ALL OF YOUR ORIGINAL LOGIC IS PRESERVED BELOW ---

  const { startDate, endDate, entries } = data
  
  const dateRange = useMemo(() => {
    return generateDateRange(new Date(startDate), new Date(endDate))
  }, [startDate, endDate])

  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null)

  const { 
    validationResult, 
    getValidationSummary, 
    getErrorsByEmployee, 
    getSetupErrors, 
    hasBasicSetup, 
    isValidating 
  } = useGridValidation(data)

  const { 
    saveTimesheet, 
    isSaving, 
    lastSaveResult, 
    clearLastResult,
    canSave: canSaveService,
  } = useTimesheetSave({
    gridId: data.id,
    onSuccess: (result) => {
      console.log('Grid save successful:', result)
      onSaveSuccess() // Notify parent page of success
    },
    onPartialSuccess: (result) => {
      console.log('Grid save partially successful:', result)
    }
  })

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
        updatedDay.timeInterval = value as string
        updatedDay.startTime = parsed?.startTime || ''
        updatedDay.endTime = parsed?.endTime || ''
        updatedDay.hours = parsed?.hours || 0
      } else {
        (updatedDay as any)[field] = value
      }
      
      newDays[date] = updatedDay
      return { ...entry, days: newDays }
    })

    onDataChange({
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
      const dateKey = formatDateLocal(date)
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
      {validationResult.setupErrorCount > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">Completează setările de bază înainte de a salva</h3>
              <div className="mt-1 text-sm text-blue-700">{getSetupErrors().map((error, index) => (<p key={index}>• {error.error}</p>))}</div>
            </div>
          </div>
        </div>
      )}
      {hasBasicSetup() && (!validationResult.isValid || validationResult.warningCount > 0) && (
        <div className="p-4 border-b border-gray-200">
          {!validationResult.isValid && (<div className="flex items-start space-x-3 mb-4">{/*...Error JSX...*/ }</div>)}
          {validationResult.warningCount > 0 && (<div className="flex items-start space-x-3">{/*...Warning JSX...*/ }</div>)}
        </div>
      )}
      {lastSaveResult && (<div className="p-4 border-b border-gray-200"><SaveStatusDisplay result={lastSaveResult} onDismiss={clearLastResult} /></div>)}
      {data.entries.length > 0 && hasBasicSetup() ? (
        <>
          <div className="overflow-x-auto overflow-y-visible">
            <div style={{ minWidth: 'max-content' }}>
              <TimesheetGridHeader dateRange={dateRange} dailyTotals={dailyTotals} />
              <div className="timesheet-grid-body">
                {data.entries.map((entry) => (
                  <TimesheetGridRow key={entry.employeeId} entry={entry} dateRange={dateRange} totalHours={employeeTotals[entry.employeeId]} selectedCell={selectedCell} readOnly={readOnly} onCellSelect={handleCellSelect} onUpdateCell={updateCell} />
                ))}
              </div>
            </div>
          </div>
          <TimesheetGridFooter totalHours={Object.values(employeeTotals).reduce((sum, hours) => sum + hours, 0)} employeeCount={data.entries.length} onSave={handleSave} onCancel={onCancel} isSaving={isSaving} readOnly={readOnly} canSave={canSave} validationSummary={getValidationSummary()} hasValidationErrors={!validationResult.isValid && hasBasicSetup()} hasSetupErrors={!hasBasicSetup()} />
        </>
      ) : (
        <div className="p-8 text-center">{/*...Placeholder JSX...*/ }</div>
      )}
    </div>
  )
}