// FILE: components/timesheets/TimesheetCell.tsx - REWRITTEN & COMPLETE
'use client'

import { useState, useRef, useEffect } from 'react'
import { type DayStatus } from '@/types/timesheet-grid'
import { TimeIntervalInput } from './cells/TimeIntervalInput'
import { StatusSelector } from './cells/StatusSelector'
import { CellValidationIndicator } from './validation/CellValidationIndicator'
import { ValidationMessage } from './validation/ValidationMessage'
import { useCellValidation } from '@/hooks/validation/useCellValidation'

interface DayData {
  startTime?: string
  endTime?: string
  timeInterval?: string
  hours: number
  status: DayStatus
  notes: string
}

interface TimesheetCellProps {
  employeeId: string
  date: string
  dayData: DayData
  isWeekend: boolean
  isSelected: boolean
  readOnly: boolean
  width: number // New prop for width, controlled by parent
  onSelect: () => void
  onUpdate: (field: 'timeInterval' | 'status' | 'notes', value: string | DayStatus) => void
  delegations?: Array<{
    employee_id: string
    valid_from: string
    to_store_id: string
    from_store_id: string
  }>
}

export function TimesheetCell({
  employeeId,
  date,
  dayData,
  isWeekend,
  isSelected,
  readOnly,
  width, // Use the width prop
  onSelect,
  onUpdate,
  delegations = []
}: TimesheetCellProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editNotesValue, setEditNotesValue] = useState('')
  const [showValidation, setShowValidation] = useState(false)
  
  // Cell height is managed locally, as it's unique to each cell
  const [cellHeight, setCellHeight] = useState<number>(() => {
    const savedKey = `cell-height-${employeeId}-${date}`
    const saved = localStorage.getItem(savedKey)
    if (saved) {
      try {
        const parsedHeight = JSON.parse(saved);
        if (typeof parsedHeight === 'number') {
          return parsedHeight;
        }
      } catch (e) {
        console.warn('Failed to parse saved cell height:', e)
      }
    }
    return 44 // Default height
  })
  
  const [isResizing, setIsResizing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const safeTimeInterval = dayData.timeInterval || ''
  const safeStatus: DayStatus = dayData.status || 'alege'
  const safeHours = dayData.hours || 0
  const safeNotes = dayData.notes || ''
  
  useEffect(() => {
    if (!dayData.status) {
      console.warn('TimesheetCell: dayData.status is undefined for:', {
        employeeId, date, dayData, safeStatus
      })
    }
  }, [dayData.status, employeeId, date, dayData, safeStatus])
  
  const { 
    validationResult, 
    suggestedFix, 
    isDelegationRestricted,
    getValidationSummary
  } = useCellValidation({
    timeInterval: safeTimeInterval,
    status: safeStatus,
    hours: safeHours,
    notes: safeNotes,
    isWeekend: isWeekend || false,
    employeeId,
    cellDate: date,
    delegations
  })
  
  useEffect(() => {
    if (!validationResult.isValid && validationResult.type === 'error') {
      console.log('TimesheetCell validation failed:', {
        summary: getValidationSummary(),
        dayData,
        safeValues: { timeInterval: safeTimeInterval, status: safeStatus, hours: safeHours, notes: safeNotes }
      })
    }
  }, [validationResult, getValidationSummary, dayData, safeTimeInterval, safeStatus, safeHours, safeNotes])
  
  const isEffectivelyReadOnly = readOnly || isDelegationRestricted
  
  // Resize functionality now only handles height
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isEffectivelyReadOnly) return
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    const startY = e.clientY
    const startHeight = cellHeight
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.max(44, Math.min(120, startHeight + deltaY))
      setCellHeight(newHeight)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      const savedKey = `cell-height-${employeeId}-${date}`
      localStorage.setItem(savedKey, JSON.stringify(cellHeight))
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }
  
  const handleRightClick = (e: React.MouseEvent) => {
    if (isEffectivelyReadOnly) return
    e.preventDefault()
    e.stopPropagation()
    setEditNotesValue(safeNotes)
    setIsEditingNotes(true)
    onSelect()
  }
  
  const saveNotesEdit = () => {
    onUpdate('notes', editNotesValue)
    setIsEditingNotes(false)
  }
  
  const cancelNotesEdit = () => {
    setIsEditingNotes(false)
    setEditNotesValue('')
  }
  
  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveNotesEdit()
    } else if (e.key === 'Escape') {
      cancelNotesEdit()
    }
  }
  
  useEffect(() => {
    if (isEditingNotes && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditingNotes])
  
  useEffect(() => {
    if (!validationResult.isValid && !isEffectivelyReadOnly) {
      setShowValidation(true)
      const timeout = validationResult.type === 'warning' ? 3000 : 5000
      const timer = setTimeout(() => setShowValidation(false), timeout)
      return () => clearTimeout(timer)
    }
  }, [validationResult.isValid, validationResult.type, isEffectivelyReadOnly])
  
  const getCellBg = () => {
    if (isDelegationRestricted) return 'bg-gray-100 border-gray-300'
    if (!validationResult.isValid) {
      if (validationResult.type === 'error') return 'bg-red-50 border-red-300'
      else if (validationResult.type === 'warning') return 'bg-yellow-50 border-yellow-300'
    }
    if (isSelected) return 'bg-blue-100 border-blue-400'
    if (isWeekend) return 'bg-gray-50'
    switch (safeStatus) {
      case 'CO': return 'bg-red-50'
      case 'CM': return 'bg-yellow-50'
      case 'dispensa': return 'bg-purple-50'
      case 'OFF': return 'bg-gray-100'
      default: return 'bg-white'
    }
  }
  
  const hasNotes = safeNotes && safeNotes.trim()
  
  const handleTimeIntervalUpdate = (value: string) => {
    console.log('TimesheetCell: Updating timeInterval:', value)
    onUpdate('timeInterval', value)
  }
  
  const handleStatusUpdate = (value: DayStatus) => {
    console.log('TimesheetCell: Updating status:', value)
    onUpdate('status', value)
  }

  const needsExpansion = () => {
    return safeTimeInterval.length > 8 || safeNotes.length > 20 || 
           (safeStatus !== 'alege' && safeTimeInterval && width <= 48)
  }

  return (
    <div className="relative">
      <div
        className={`border-r border-gray-300 cursor-pointer relative flex flex-col transition-all duration-200 ${getCellBg()} ${
          isSelected ? 'ring-2 ring-blue-400' : ''
        } ${isDelegationRestricted ? 'opacity-60' : ''} ${
          isResizing ? 'shadow-lg' : ''
        }`}
        onClick={onSelect}
        onContextMenu={handleRightClick}
        style={{ 
          width: `${width}px`,
          minHeight: `${cellHeight}px`,
          overflow: 'hidden'
        }}
        title={isDelegationRestricted ? 'Employee delegated - editing restricted after delegation date' : undefined}
      >
        {/* Time Section */}
        <div className="flex-1 flex items-center justify-center px-1 overflow-hidden">
          <div className="w-full min-w-0">
            <TimeIntervalInput
              timeInterval={safeTimeInterval}
              status={safeStatus}
              hours={safeHours}
              notes={safeNotes}
              isWeekend={isWeekend}
              readOnly={isEffectivelyReadOnly}
              employeeId={employeeId}
              cellDate={date}
              onTimeIntervalChange={handleTimeIntervalUpdate}
              onFocus={onSelect}
            />
          </div>
        </div>

        {/* Status Section */}
        <div className="flex items-center justify-center pb-1 relative">
          <StatusSelector
            status={safeStatus}
            timeInterval={safeTimeInterval}
            hours={safeHours}
            notes={safeNotes}
            isWeekend={isWeekend}
            readOnly={isEffectivelyReadOnly}
            onStatusChange={handleStatusUpdate}
          />
        </div>

        {/* Expanded notes display for larger cells */}
        {cellHeight > 60 && hasNotes && (
          <div className="px-1 pb-1">
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-1 break-words" 
                 style={{ fontSize: '10px', lineHeight: '1.2' }}>
              {safeNotes.length > 50 ? `${safeNotes.substring(0, 50)}...` : safeNotes}
            </div>
          </div>
        )}

        {/* Resize Handles - only for height */}
        {isSelected && !isEffectivelyReadOnly && (
          <>
            <div
              className="absolute left-0 right-0 bottom-0 h-1 bg-transparent hover:bg-blue-500 cursor-ns-resize z-20 group"
              onMouseDown={handleResizeStart}
              title="Drag to resize height"
            >
              <div className="w-full h-full opacity-0 group-hover:opacity-50 bg-blue-500 transition-opacity" />
            </div>
            
            <div
              className="absolute right-0 bottom-0 w-3 h-3 bg-blue-400 hover:bg-blue-600 cursor-ns-resize z-30 opacity-60 hover:opacity-80 rounded-tl"
              onMouseDown={handleResizeStart}
              title="Drag to resize height"
            />
          </>
        )}

        {/* Quick expand button for cramped content */}
        {needsExpansion() && isSelected && !isEffectivelyReadOnly && 
         width <= 48 && cellHeight <= 44 && (
          <button
            className="absolute top-1 right-1 w-4 h-4 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center justify-center z-10 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              // This button now only affects height. You could also have it affect width by calling a prop.
              setCellHeight(70); 
              const savedKey = `cell-height-${employeeId}-${date}`
              localStorage.setItem(savedKey, JSON.stringify(70))
            }}
            title="Auto-expand cell"
          >
            ⤢
          </button>
        )}

        {/* Validation Indicator */}
        {!validationResult.isValid && (
          <CellValidationIndicator
            validation={validationResult}
            className="absolute top-1 left-1"
            size="sm"
          />
        )}

        {/* Delegation restriction indicator */}
        {isDelegationRestricted && (
          <div className="absolute top-1 right-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full" title="Delegation restricted" />
          </div>
        )}

        {/* Notes Indicator - only show for smaller cells */}
        {hasNotes && cellHeight <= 60 && (
          <div 
            className="absolute bottom-1 right-1 cursor-pointer z-10"
            onClick={(e) => {
              e.stopPropagation()
              if (!isEffectivelyReadOnly) {
                handleRightClick(e as any)
              }
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isDelegationRestricted ? 'bg-orange-300' : 'bg-orange-400 hover:bg-orange-500'
            }`} />
          </div>
        )}
      </div>

      {/* Notes Edit Popup */}
      {isEditingNotes && !isDelegationRestricted && (
        <div 
          className="absolute top-full left-0 z-50 bg-white border rounded shadow-lg p-2" 
          style={{ width: Math.max(144, width + 20) }}
        >
          <textarea
            ref={textareaRef}
            value={editNotesValue}
            onChange={(e) => setEditNotesValue(e.target.value)}
            onKeyDown={handleNotesKeyDown}
            className="w-full h-16 text-xs border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Add note..."
            maxLength={200}
          />
          <div className="flex justify-end space-x-1 mt-1">
            <button
              onClick={cancelNotesEdit}
              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={saveNotesEdit}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Validation Message Popup */}
      {showValidation && !validationResult.isValid && (
        <div className="absolute top-full left-0 z-40 mt-1">
          <ValidationMessage
            validation={validationResult}
            showIcon={true}
            className="shadow-lg"
          />
          {suggestedFix && (
            <div className="mt-1 text-xs text-gray-600 bg-gray-100 p-1 rounded">
              💡 {suggestedFix.description}
            </div>
          )}
        </div>
      )}
    </div>
  )
}