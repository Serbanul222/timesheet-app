// FILE: components/timesheets/TimesheetGridHeader.tsx - REWRITTEN & COMPLETE
'use client'
import { formatTimeForGrid, formatDateLocal, formatDateForDB } from '@/lib/timesheet-utils'
import { useCallback } from 'react'
import { type ColumnWidths } from './TimesheetGrid'
import { type RomanianHoliday } from '@/lib/services/romanianHolidays';

interface TimesheetGridHeaderProps {
  dateRange: Date[]
  dailyTotals: Record<string, number>
  columnWidths: ColumnWidths
  onColumnResize: (columnType: keyof ColumnWidths | string, newWidth: number) => void
  holidays: Map<string, RomanianHoliday>
}

// ✅ A CLEAR, INTUITIVE ICON FOR HOLIDAYS
const HolidayIcon = ({ holidayName }: { holidayName: string }) => (
  <div title={holidayName}>
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-3.5 w-3.5 text-green-600" 
      viewBox="0 0 20 20" 
      fill="currentColor"
    >
      <path 
        fillRule="evenodd" 
        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" 
        clipRule="evenodd" 
      />
    </svg>
  </div>
);


export function TimesheetGridHeader({
  dateRange,
  dailyTotals,
  columnWidths,
  onColumnResize,
  holidays
}: TimesheetGridHeaderProps) {
  
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    columnType: keyof ColumnWidths | string,
    startWidth: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    
    const startX = e.clientX

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX
      const newWidth = Math.max(48, startWidth + deltaX)
      onColumnResize(columnType, newWidth)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [onColumnResize])

  const ResizeHandle = ({ 
    columnType, 
    currentWidth 
  }: { 
    columnType: keyof ColumnWidths | string
    currentWidth: number 
  }) => (
    <div
      className="absolute right-0 top-0 bottom-0 w-2 bg-transparent hover:bg-blue-500 cursor-col-resize z-10 group transition-colors"
      onMouseDown={(e) => handleResizeStart(e, columnType, currentWidth)}
      title="Drag to resize column"
    >
      <div className="w-full h-full opacity-0 group-hover:opacity-30 bg-blue-500 transition-opacity" />
    </div>
  )

  return (
    <div className="timesheet-grid-header border-b-2 border-gray-300 bg-gray-50">
      <div className="flex" style={{ minWidth: 'max-content' }}>
        {/* Employee Info Columns */}
        <div 
          className="px-2 py-2 border-r border-gray-300 font-medium text-xs text-gray-700 flex items-center justify-center relative"
          style={{ width: `${columnWidths.employeeName}px` }}
        >
          <span className="truncate">Nume Angajat</span>
          <ResizeHandle columnType="employeeName" currentWidth={columnWidths.employeeName} />
        </div>
        <div 
          className="px-2 py-2 border-r border-gray-300 font-medium text-xs text-gray-700 flex items-center justify-center relative"
          style={{ width: `${columnWidths.position}px` }}
        >
          <span className="truncate">Poziție</span>
          <ResizeHandle columnType="position" currentWidth={columnWidths.position} />
        </div>

        {/* Date Columns */}
        <div className="flex">
          {dateRange.map((date) => {
            const dateKey = formatDateLocal(date)
            const dbDateKey = formatDateForDB(date);
            const holidayInfo = holidays.get(dbDateKey);
            
            const timeInfo = formatTimeForGrid(date)
            const total = dailyTotals[dateKey] || 0
            const columnWidth = columnWidths.dateColumns[dateKey] || 48
           
            return (
              <div
                key={dateKey}
                className={`border-r border-gray-300 text-center flex-shrink-0 relative ${
                  timeInfo.isWeekend ? 'bg-gray-100' : ''
                } ${
                  holidayInfo ? 'bg-green-100' : '' // ✅ MORE VISIBLE BACKGROUND
                }`}
                style={{ width: `${columnWidth}px` }}
                title={`${timeInfo.fullDate} - ${timeInfo.dayName}${
                  holidayInfo ? `\nSărbătoare: ${holidayInfo.localName}` : ''
                }`}
              >
                <div className="h-8 flex flex-col justify-center border-b border-gray-200">
                  <div className="text-xs font-medium text-gray-600 truncate px-1 flex items-center justify-center space-x-1">
                    <span>{timeInfo.dayName}</span>
                    {/* ✅ REPLACED DOT WITH ICON */}
                    {holidayInfo && <HolidayIcon holidayName={holidayInfo.localName} />}
                  </div>
                  <div className={`text-xs font-bold truncate px-1 ${
                      timeInfo.isWeekend ? 'text-red-600' : 'text-gray-900'
                    } ${
                      holidayInfo ? 'text-green-800' : ''
                    }`}>
                      {timeInfo.dayNumber}
                  </div>
                </div>
                <div className="h-6 flex items-center justify-center">
                  <div className="text-xs font-medium text-blue-600 truncate px-1">{total > 0 ? `${total}h` : ''}</div>
                </div>
                <ResizeHandle columnType={dateKey} currentWidth={columnWidth} />
              </div>
            )
          })}
        </div>

        {/* Total Column */}
        <div 
          className="border-l-2 border-gray-400 font-medium text-xs text-gray-700 text-center flex-shrink-0 flex items-center justify-center relative"
          style={{ width: `${columnWidths.total}px` }}
        >
          <span className="truncate">Total</span>
          <ResizeHandle columnType="total" currentWidth={columnWidths.total} />
        </div>
      </div>
    </div>
  )
}