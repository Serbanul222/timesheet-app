// FILE: components/timesheets/TimesheetGridRow.tsx - REWRITTEN & COMPLETE
'use client'

import { TimesheetCell } from './TimesheetCell'
import { type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { formatHours } from '@/lib/utils'
import { formatDateLocal } from '@/lib/timesheet-utils'
import { type ColumnWidths } from './TimesheetGrid'

interface TimesheetGridRowProps {
  entry: TimesheetEntry
  dateRange: Date[]
  totalHours: number
  selectedCell: {
    employeeId: string
    date: string
  } | null
  readOnly: boolean
  onCellSelect: (employeeId: string, date: string) => void
  onUpdateCell: (
    employeeId: string,
    date: string,
    field: 'timeInterval' | 'status' | 'notes',
    value: string | DayStatus
  ) => void
  delegations?: Array<{
    employee_id: string
    valid_from: string
    to_store_id: string
    from_store_id: string
  }>
  columnWidths: ColumnWidths
}

export function TimesheetGridRow({
  entry,
  dateRange,
  totalHours,
  selectedCell,
  readOnly,
  onCellSelect,
  onUpdateCell,
  delegations = [],
  columnWidths
}: TimesheetGridRowProps) {
  return (
    <div className="timesheet-grid-row flex border-b border-gray-200 hover:bg-gray-50">
      {/* 1. Employee Name Column */}
      <div 
        className="px-2 py-2 border-r border-gray-300 flex items-center flex-shrink-0"
        style={{ width: `${columnWidths.employeeName}px` }}
      >
        <div>
          <div className="font-medium text-sm text-gray-900 truncate">
            {entry.employeeName}
          </div>
          <div className="text-xs text-gray-500">
            ID: {entry.employeeId.slice(-6)}
          </div>
        </div>
      </div>
      
      {/* 2. Position Column */}
      <div 
        className="px-2 py-2 border-r border-gray-300 flex items-center flex-shrink-0"
        style={{ width: `${columnWidths.position}px` }}
      >
        <div className="text-xs text-gray-600 truncate">
          {entry.position}
        </div>
      </div>

      {/* 3. Daily Cells Container */}
      <div className="flex">
        {dateRange.map((date) => {
          const dateKey = formatDateLocal(date)
          
          const dayData = entry.days[dateKey] || {
            timeInterval: '',
            startTime: '',
            endTime: '',
            hours: 0,
            status: 'alege' as DayStatus,
            notes: ''
          }
          
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const isSelected = selectedCell?.employeeId === entry.employeeId && 
                           selectedCell?.date === dateKey

          return (
            <TimesheetCell
              key={`${entry.employeeId}-${dateKey}`}
              employeeId={entry.employeeId}
              date={dateKey}
              dayData={dayData}
              isWeekend={isWeekend}
              isSelected={isSelected}
              readOnly={readOnly}
              width={columnWidths.dateColumns[dateKey] || 48}
              onSelect={() => onCellSelect(entry.employeeId, dateKey)}
              onUpdate={(field, value) => onUpdateCell(entry.employeeId, dateKey, field, value)}
              delegations={delegations}
            />
          )
        })}
      </div>

      {/* 4. Total Hours Column */}
      <div 
        className="px-2 py-2 border-l-2 border-gray-400 flex items-center justify-center flex-shrink-0"
        style={{ width: `${columnWidths.total}px` }}
      >
        <div className="text-sm font-bold text-blue-700">
          {formatHours(totalHours)}
        </div>
      </div>
    </div>
  )
}