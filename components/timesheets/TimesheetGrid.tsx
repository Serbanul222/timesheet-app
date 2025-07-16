// components/timesheets/TimesheetGrid.tsx - Updated with real save functionality
'use client'

import { useMemo, useCallback, useState } from 'react'
import { TimesheetGridHeader } from './TimesheetGridHeader'
import { TimesheetGridRow } from './TimesheetGridRow'
import { TimesheetGridFooter } from './TimesheetGridFooter'
import { SaveStatusDisplay } from './SaveStatusDisplay'
import { type TimesheetGridData, type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, calculateTotalHours } from '@/lib/timesheet-utils'
import { useTimesheetSave } from '@/hooks/timesheet/useTimesheetSave'

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
  data: TimesheetGridData
  onDataChange: (newData: TimesheetGridData) => void
  onSave?: () => Promise<void> // Optional fallback
  onCancel: () => void
  readOnly?: boolean
  className?: string
}

export function TimesheetGrid({
  data,
  onDataChange,
  onSave,
  onCancel,
  readOnly = false,
  className = ''
}: TimesheetGridProps) {
  const { startDate, endDate, entries } = data
  
  const dateRange = useMemo(() => {
    return generateDateRange(new Date(startDate), new Date(endDate))
  }, [startDate, endDate])

  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null)

  // ✅ NEW: Use persistent session ID based on grid data ID
  const { 
    saveTimesheet, 
    isSaving, 
    lastSaveResult, 
    clearLastResult,
    canSave,
    sessionId
  } = useTimesheetSave({
    gridId: data.id, // Use grid data ID for session consistency
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

  // ✅ FIX: Handle save with proper store/zone context
  const handleSave = async () => {
    if (readOnly || !canSave) return

    try {
      // Ensure grid data has store/zone information
      const enrichedData = {
        ...data,
        // If no store/zone specified, the service will use employee's store/zone
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
      {/* ✅ NEW: Save Status Display */}
      {lastSaveResult && (
        <div className="p-4 border-b border-gray-200">
          <SaveStatusDisplay 
            result={lastSaveResult}
            onDismiss={clearLastResult}
          />
        </div>
      )}

      {data.entries.length > 0 ? (
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
          />
        </>
      ) : (
        <div className="p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Selected</h3>
          <p className="text-gray-600">Select employees from the controls above to start creating timesheets</p>
        </div>
      )}
    </div>
  )
}

export default TimesheetGrid