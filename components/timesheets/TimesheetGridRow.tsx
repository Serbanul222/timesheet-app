'use client'

import { TimesheetCell } from './TimesheetCell'
import { type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { formatHours } from '@/lib/utils'

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
}

export function TimesheetGridRow({
  entry,
  dateRange,
  totalHours,
  selectedCell,
  readOnly,
  onCellSelect,
  onUpdateCell
}: TimesheetGridRowProps) {
  return (
    <div className="timesheet-grid-row flex border-b border-gray-200 hover:bg-gray-50" style={{ minWidth: 'max-content' }}>
      {/* Employee Info */}
      <div className="flex flex-shrink-0">
        <div className="w-40 px-2 py-2 border-r border-gray-300 flex items-center">
          <div>
            <div className="font-medium text-sm text-gray-900 truncate">
              {entry.employeeName}
            </div>
            <div className="text-xs text-gray-500">
              ID: {entry.employeeId.slice(-6)}
            </div>
          </div>
        </div>
        
        <div className="w-24 px-2 py-2 border-r border-gray-300 flex items-center">
          <div className="text-xs text-gray-600 truncate">
            {entry.position}
          </div>
        </div>
      </div>

      {/* Daily Cells */}
      <div className="flex">
        {dateRange.map((date, index) => {
          const dateKey = date.toISOString().split('T')[0]
          const dayData = entry.days[dateKey] || {
            timeInterval: '',
            startTime: '',
            endTime: '',
            hours: 0,
            status: 'off' as DayStatus,
            notes: ''
          }
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const isSelected = selectedCell?.employeeId === entry.employeeId && 
                           selectedCell?.date === dateKey

          console.log(`Rendering cell ${index + 1}/${dateRange.length} for date:`, dateKey, 'data:', dayData)

          return (
            <TimesheetCell
              key={`${entry.employeeId}-${dateKey}`}
              employeeId={entry.employeeId}
              date={dateKey}
              dayData={dayData}
              isWeekend={isWeekend}
              isSelected={isSelected}
              readOnly={readOnly}
              onSelect={() => onCellSelect(entry.employeeId, dateKey)}
              onUpdate={(field, value) => onUpdateCell(entry.employeeId, dateKey, field, value)}
            />
          )
        })}
      </div>

      {/* Total Hours */}
      <div className="w-16 px-2 py-2 border-l-2 border-gray-400 flex items-center justify-center flex-shrink-0">
        <div className="text-sm font-bold text-blue-700">
          {formatHours(totalHours)}
        </div>
      </div>
    </div>
  )
}