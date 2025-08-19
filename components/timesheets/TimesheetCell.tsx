// components/timesheets/TimesheetCell.tsx - FIXED: Proper status handling and validation
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
  onSelect: () => void
  onUpdate: (field: 'timeInterval' | 'status' | 'notes', value: string | DayStatus) => void
  // Delegation context for validation
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
  onSelect,
  onUpdate,
  delegations = []
}: TimesheetCellProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editNotesValue, setEditNotesValue] = useState('')
  const [showValidation, setShowValidation] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // ✅ FIXED: Ensure all values are properly defined with safe defaults
  const safeTimeInterval = dayData.timeInterval || ''
  const safeStatus: DayStatus = dayData.status || 'alege' // ✅ FIXED: Default to 'alege' if undefined
  const safeHours = dayData.hours || 0
  const safeNotes = dayData.notes || ''
  
  // ✅ FIXED: Debug logging to catch undefined values
  useEffect(() => {
    if (!dayData.status) {
      console.warn('TimesheetCell: dayData.status is undefined for:', {
        employeeId,
        date,
        dayData,
        safeStatus
      })
    }
  }, [dayData.status, employeeId, date, dayData, safeStatus])
  
  // ✅ ENHANCED: Real-time validation with proper safe values
  const { 
    validationResult, 
    suggestedFix, 
    isDelegationRestricted,
    getValidationSummary // ✅ Added for debugging
  } = useCellValidation({
    timeInterval: safeTimeInterval,
    status: safeStatus, // ✅ FIXED: Use safe status
    hours: safeHours,
    notes: safeNotes,
    isWeekend: isWeekend || false,
    employeeId,
    cellDate: date,
    delegations
  })
  
  // ✅ DEBUG: Log validation context when there are issues
  useEffect(() => {
    if (!validationResult.isValid && validationResult.type === 'error') {
      console.log('TimesheetCell validation failed:', {
        summary: getValidationSummary(),
        dayData,
        safeValues: {
          timeInterval: safeTimeInterval,
          status: safeStatus,
          hours: safeHours,
          notes: safeNotes
        }
      })
    }
  }, [validationResult, getValidationSummary, dayData, safeTimeInterval, safeStatus, safeHours, safeNotes])
  
  // Determine if cell should be read-only due to delegation
  const isEffectivelyReadOnly = readOnly || isDelegationRestricted
  
  // Handle right-click for notes
  const handleRightClick = (e: React.MouseEvent) => {
    if (isEffectivelyReadOnly) return
    e.preventDefault()
    e.stopPropagation()
    setEditNotesValue(safeNotes)
    setIsEditingNotes(true)
    onSelect()
  }
  
  // Save notes edit
  const saveNotesEdit = () => {
    onUpdate('notes', editNotesValue)
    setIsEditingNotes(false)
  }
  
  // Cancel notes edit
  const cancelNotesEdit = () => {
    setIsEditingNotes(false)
    setEditNotesValue('')
  }
  
  // Handle keyboard for notes
  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveNotesEdit()
    } else if (e.key === 'Escape') {
      cancelNotesEdit()
    }
  }
  
  // Focus effects for notes
  useEffect(() => {
    if (isEditingNotes && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditingNotes])
  
  // Auto-show validation on invalid state
  useEffect(() => {
    if (!validationResult.isValid && !isEffectivelyReadOnly) {
      setShowValidation(true)
      const timeout = validationResult.type === 'warning' ? 3000 : 5000
      const timer = setTimeout(() => setShowValidation(false), timeout)
      return () => clearTimeout(timer)
    }
  }, [validationResult.isValid, validationResult.type, isEffectivelyReadOnly])
  
  // ✅ ENHANCED: Cell background with delegation consideration
  const getCellBg = () => {
    // Delegation restricted cells get special styling
    if (isDelegationRestricted) {
      return 'bg-gray-100 border-gray-300'
    }
    
    if (!validationResult.isValid) {
      if (validationResult.type === 'error') {
        return 'bg-red-50 border-red-300'
      } else if (validationResult.type === 'warning') {
        return 'bg-yellow-50 border-yellow-300'
      }
    }
    
    if (isSelected) {
      return 'bg-blue-100 border-blue-400'
    }
    
    if (isWeekend) {
      return 'bg-gray-50'
    }
    
    // ✅ FIXED: Use safe status for switch
    switch (safeStatus) {
      case 'CO': return 'bg-red-50'
      case 'CM': return 'bg-yellow-50'
      case 'dispensa': return 'bg-purple-50'
      case 'OFF': return 'bg-gray-100'
      default: return 'bg-white'
    }
  }
  
  const hasNotes = safeNotes && safeNotes.trim()
  
  // ✅ FIXED: Handle update functions with proper validation
  const handleTimeIntervalUpdate = (value: string) => {
    console.log('TimesheetCell: Updating timeInterval:', value)
    onUpdate('timeInterval', value)
  }
  
  const handleStatusUpdate = (value: DayStatus) => {
    console.log('TimesheetCell: Updating status:', value)
    onUpdate('status', value)
  }
  
  const handleNotesUpdate = (value: string) => {
    console.log('TimesheetCell: Updating notes:', value)
    onUpdate('notes', value)
  }
  
  return (
    <div className="relative">
      <div
        className={`w-12 border-r border-gray-300 cursor-pointer relative flex flex-col ${getCellBg()} ${
          isSelected ? 'ring-2 ring-blue-400' : ''
        } ${isDelegationRestricted ? 'opacity-60' : ''}`}
        onClick={onSelect}
        onContextMenu={handleRightClick}
        style={{ minHeight: '44px' }}
        title={isDelegationRestricted ? 'Employee delegated - editing restricted after delegation date' : undefined}
      >
        {/* Time Section */}
        <div className="flex-1 flex items-center justify-center px-1">
          <TimeIntervalInput
            timeInterval={safeTimeInterval}
            status={safeStatus}
            hours={safeHours}
            notes={safeNotes}
            isWeekend={isWeekend}
            readOnly={isEffectivelyReadOnly}
            employeeId={employeeId}
            cellDate={date}
            onTimeIntervalChange={handleTimeIntervalUpdate} // ✅ FIXED: Use wrapper function
            onFocus={onSelect}
          />
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
            onStatusChange={handleStatusUpdate} // ✅ FIXED: Use wrapper function
          />
        </div>

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

        {/* Notes Indicator */}
        {hasNotes && (
          <div 
            className="absolute bottom-1 right-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              if (!isEffectivelyReadOnly) {
                handleRightClick(e as any)
              }
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              isDelegationRestricted ? 'bg-orange-300' : 'bg-orange-400 hover:bg-orange-500'
            }`} />
          </div>
        )}
      </div>

      {/* Notes Edit Popup - only if not delegation restricted */}
      {isEditingNotes && !isDelegationRestricted && (
        <div className="absolute top-full left-0 z-50 bg-white border rounded shadow-lg p-2 w-36">
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