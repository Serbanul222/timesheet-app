'use client'

import { useMemo, useCallback, useState } from 'react'
import { TimesheetGridHeader } from './TimesheetGridHeader'
import { TimesheetGridRow } from './TimesheetGridRow'
import { TimesheetGridFooter } from './TimesheetGridFooter'
import { type TimesheetGridData, type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, calculateTotalHours } from '@/lib/timesheet-utils'

// Local parsing function (no changes needed here)
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

// ✅ PROPS CHANGE: We now accept `data` and `onDataChange`
interface TimesheetGridProps {
  data: TimesheetGridData // The single source of truth for grid data
  onDataChange: (newData: TimesheetGridData) => void // Callback to update the parent's state
  onSave: () => Promise<void> // onSave no longer needs to pass data; parent already has it
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
  
  // ✅ REMOVED: All internal `useState` for `gridData` is gone.
  // The component now relies entirely on the `data` prop.

  const { startDate, endDate, entries } = data;

  const dateRange = useMemo(() => {
    return generateDateRange(new Date(startDate), new Date(endDate))
  }, [startDate, endDate])

  const [isSaving, setIsSaving] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null)

  // ✅ REWRITTEN: updateCell now calculates the new state and calls the parent.
  const updateCell = useCallback((
    employeeId: string, 
    date: string, 
    field: 'timeInterval' | 'status' | 'notes', 
    value: string | DayStatus
  ) => {
    if (readOnly) return

    // Create a deep copy of the entries to modify
    const newEntries = data.entries.map(entry => {
      if (entry.employeeId !== employeeId) {
        return entry
      }

      // Deep copy the days object of the target entry
      const newDays = { ...entry.days };
      const currentDay = newDays[date] || {};

      // Calculate the updated day object
      const updatedDay = { ...currentDay };
      if (field === 'timeInterval') {
        const parsed = parseTimeInterval(value as string)
        if (parsed) {
          updatedDay.timeInterval = value as string;
          updatedDay.startTime = parsed.startTime;
          updatedDay.endTime = parsed.endTime;
          updatedDay.hours = parsed.hours;
        } else {
          updatedDay.timeInterval = value as string;
          updatedDay.startTime = '';
          updatedDay.endTime = '';
          updatedDay.hours = 0;
        }
      } else {
        (updatedDay as any)[field] = value;
      }
      
      newDays[date] = updatedDay;
      return { ...entry, days: newDays };
    });

    // Notify the parent component with the entire new data object
    onDataChange({
      ...data,
      entries: newEntries,
      updatedAt: new Date().toISOString()
    })

  }, [readOnly, data, onDataChange])

  // All calculations are now based on the `data` prop
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
    if (readOnly) return
    setIsSaving(true)
    try {
      await onSave() // Parent already has the latest data
    } catch (error) {
      console.error('Failed to save timesheet:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCellSelect = (employeeId: string, date: string) => {
    setSelectedCell({ employeeId, date })
  }

  return (
    <div className={`timesheet-grid bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
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
            {/* ... No Employees Selected SVG and text ... */}
        </div>
      )}
    </div>
  )
}

export default TimesheetGrid;