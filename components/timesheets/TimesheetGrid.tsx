'use client'

import { useState, useMemo, useEffect } from 'react'
import { TimesheetGridHeader } from './TimesheetGridHeader'
import { TimesheetGridRow } from './TimesheetGridRow'
import { TimesheetGridFooter } from './TimesheetGridFooter'
import { type TimesheetGridData, type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, calculateTotalHours } from '@/lib/timesheet-utils'

interface TimesheetGridProps {
  startDate: Date
  endDate: Date
  employees: Array<{
    id: string
    name: string
    position?: string
  }>
  existingData?: TimesheetGridData
  onSave: (data: TimesheetGridData) => Promise<void>
  onCancel: () => void
  readOnly?: boolean
  className?: string
}

export function TimesheetGrid({
  startDate,
  endDate,
  employees,
  existingData,
  onSave,
  onCancel,
  readOnly = false,
  className = ''
}: TimesheetGridProps) {
  // Generate date range for columns
  const dateRange = useMemo(() => {
    const range = generateDateRange(startDate, endDate)
    console.log('TimesheetGrid: Generated date range:', range.length, 'days')
    return range
  }, [startDate, endDate])

  console.log('TimesheetGrid props:', {
    employees: employees.length,
    existingData: existingData?.entries?.length || 0,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  })

  // Initialize grid data
  const [gridData, setGridData] = useState<TimesheetGridData>(() => {
    if (existingData && existingData.entries.length > 0) {
      return existingData
    }

    // Create empty grid structure
    const entries: TimesheetEntry[] = employees.map(employee => ({
      employeeId: employee.id,
      employeeName: employee.name,
      position: employee.position || 'Staff',
      days: dateRange.reduce((acc, date) => {
        acc[date.toISOString().split('T')[0]] = {
          startTime: '',
          endTime: '',
          hours: 0,
          status: 'off' as DayStatus,
          notes: ''
        }
        return acc
      }, {} as Record<string, { startTime?: string; endTime?: string; hours: number; status: DayStatus; notes: string }>)
    }))

    return {
      id: existingData?.id || crypto.randomUUID(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      entries,
      createdAt: existingData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })

  // Update grid data when employees or dates change
  useEffect(() => {
    if (existingData && existingData.entries.length > 0) {
      setGridData(existingData)
    } else {
      // Recreate entries when employees change
      const entries: TimesheetEntry[] = employees.map(employee => ({
        employeeId: employee.id,
        employeeName: employee.name,
        position: employee.position || 'Staff',
        days: dateRange.reduce((acc, date) => {
          const dateKey = date.toISOString().split('T')[0]
          // Keep existing data if it exists
          const existingEntry = gridData.entries.find(e => e.employeeId === employee.id)
          acc[dateKey] = existingEntry?.days[dateKey] ? {
            startTime: existingEntry.days[dateKey].startTime || '',
            endTime: existingEntry.days[dateKey].endTime || '',
            hours: existingEntry.days[dateKey].hours || 0,
            status: existingEntry.days[dateKey].status || 'off' as DayStatus,
            notes: existingEntry.days[dateKey].notes || ''
          } : {
            startTime: '',
            endTime: '',
            hours: 0,
            status: 'off' as DayStatus,
            notes: ''
          }
          return acc
        }, {} as Record<string, { startTime?: string; endTime?: string; hours: number; status: DayStatus; notes: string }>)
      }))

      setGridData(prev => ({
        ...prev,
        entries,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        updatedAt: new Date().toISOString()
      }))
    }
  }, [employees, dateRange, existingData])

  const [isSaving, setIsSaving] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    employeeId: string
    date: string
  } | null>(null)

  // Update cell value
  const updateCell = (
    employeeId: string, 
    date: string, 
    field: 'startTime' | 'endTime' | 'hours' | 'status' | 'notes', 
    value: string | number | DayStatus
  ) => {
    if (readOnly) return

    console.log('Updating cell:', { employeeId, date, field, value })

    setGridData(prev => ({
      ...prev,
      entries: prev.entries.map(entry => 
        entry.employeeId === employeeId
          ? {
              ...entry,
              days: {
                ...entry.days,
                [date]: {
                  ...entry.days[date],
                  [field]: value
                }
              }
            }
          : entry
      ),
      updatedAt: new Date().toISOString()
    }))
  }

  // Calculate totals for each employee
  const employeeTotals = useMemo(() => {
    return gridData.entries.reduce((acc, entry) => {
      acc[entry.employeeId] = calculateTotalHours(entry.days)
      return acc
    }, {} as Record<string, number>)
  }, [gridData.entries])

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    return dateRange.reduce((acc, date) => {
      const dateKey = date.toISOString().split('T')[0]
      const total = gridData.entries.reduce((sum, entry) => {
        return sum + (entry.days[dateKey]?.hours || 0)
      }, 0)
      acc[dateKey] = total
      return acc
    }, {} as Record<string, number>)
  }, [gridData.entries, dateRange])

  // Handle save
  const handleSave = async () => {
    if (readOnly) return
    
    setIsSaving(true)
    try {
      await onSave(gridData)
    } catch (error) {
      console.error('Failed to save timesheet:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle cell selection
  const handleCellSelect = (employeeId: string, date: string) => {
    setSelectedCell({ employeeId, date })
  }

  return (
    <div className={`timesheet-grid bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Only show grid if we have employees */}
      {gridData.entries.length > 0 ? (
        <>
          {/* Grid Container with Horizontal Scroll */}
          <div className="overflow-x-auto overflow-y-visible">
            <div style={{ minWidth: 'max-content' }}>
              {/* Grid Header */}
              <TimesheetGridHeader
                dateRange={dateRange}
                dailyTotals={dailyTotals}
              />

              {/* Grid Body */}
              <div className="timesheet-grid-body">
                {gridData.entries.map((entry) => (
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

          {/* Grid Footer */}
          <TimesheetGridFooter
            totalHours={Object.values(employeeTotals).reduce((sum, hours) => sum + hours, 0)}
            employeeCount={gridData.entries.length}
            onSave={handleSave}
            onCancel={onCancel}
            isSaving={isSaving}
            readOnly={readOnly}
          />
        </>
      ) : (
        /* Empty State */
        <div className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No employees selected</h3>
          <p className="text-gray-600">Select employees from the list above to start creating your timesheet grid.</p>
        </div>
      )}
    </div>
  )
}

// Add default export as well
export default TimesheetGrid