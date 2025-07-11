'use client'

import { formatDate, formatHours } from '@/lib/utils'

interface TimesheetGridHeaderProps {
  dateRange: Date[]
  dailyTotals: Record<string, number>
}

export function TimesheetGridHeader({ 
  dateRange, 
  dailyTotals 
}: TimesheetGridHeaderProps) {
  return (
    <div className="timesheet-grid-header border-b-2 border-gray-300 bg-gray-50">
      {/* Column Headers Row 1 - Dates */}
      <div className="flex" style={{ minWidth: 'max-content' }}>
        {/* Employee Info Columns */}
        <div className="flex flex-shrink-0">
          <div className="w-40 px-2 py-2 border-r border-gray-300 font-medium text-xs text-gray-700 flex items-center justify-center">
            Employee Name
          </div>
          <div className="w-24 px-2 py-2 border-r border-gray-300 font-medium text-xs text-gray-700 flex items-center justify-center">
            Position
          </div>
        </div>

        {/* Date Columns */}
        <div className="flex">
          {dateRange.map((date) => {
            const dateKey = date.toISOString().split('T')[0]
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
            const dayNumber = date.getDate()
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const total = dailyTotals[dateKey] || 0
            
            return (
              <div
                key={dateKey}
                className={`w-12 border-r border-gray-300 text-center flex-shrink-0 ${
                  isWeekend ? 'bg-gray-100' : ''
                }`}
              >
                {/* Date Header */}
                <div className="h-8 flex flex-col justify-center border-b border-gray-200">
                  <div className="text-xs font-medium text-gray-600">
                    {dayOfWeek}
                  </div>
                  <div className={`text-xs font-bold ${
                    isWeekend ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {dayNumber}
                  </div>
                </div>
                
                {/* Daily Total */}
                <div className="h-6 flex items-center justify-center">
                  <div className="text-xs font-medium text-blue-600">
                    {total > 0 ? `${total}h` : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Total Column */}
        <div className="w-16 border-l-2 border-gray-400 font-medium text-xs text-gray-700 text-center flex-shrink-0 flex items-center justify-center">
          Total
        </div>
      </div>
    </div>
  )
}