// components/timesheets/TimesheetCell.tsx - ENHANCED: Added delegation date restrictions
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
  // ✅ NEW: Delegation context for validation
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
  delegations = [] // ✅ NEW: Delegation data
}: TimesheetCellProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editNotesValue, setEditNotesValue] = useState('')
  const [showValidation, setShowValidation] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // ✅ ENHANCED: Real-time validation with delegation context
  const { 
    validationResult, 
    suggestedFix, 
    isDelegationRestricted 
  } = useCellValidation({
    timeInterval: dayData.timeInterval || '',
    status: dayData.status,
    hours: dayData.hours,
    notes: dayData.notes,
    isWeekend,
    // ✅ NEW: Pass delegation context
    employeeId,
    cellDate: date,
    delegations
  })
  
  // ✅ NEW: Determine if cell should be read-only due to delegation
  const isEffectivelyReadOnly = readOnly || isDelegationRestricted
  
  // Handle right-click for notes
  const handleRightClick = (e: React.MouseEvent) => {
    if (isEffectivelyReadOnly) return
    e.preventDefault()
    e.stopPropagation()
    setEditNotesValue(dayData.notes || '')
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
    
    switch (dayData.status) {
      case 'CO': return 'bg-red-50'
      case 'CM': return 'bg-yellow-50'
      case 'dispensa': return 'bg-purple-50'
      case 'OFF': return 'bg-gray-100'
      default: return 'bg-white'
    }
  }
  
  const hasNotes = dayData.notes && dayData.notes.trim()
  
  return (
    <div className="relative">
      <div
        className={`w-12 border-r border-gray-300 cursor-pointer relative flex flex-col ${getCellBg()} ${
          isSelected ? 'ring-2 ring-blue-400' : ''
        } ${isDelegationRestricted ? 'opacity-60' : ''}`} // ✅ NEW: Visual indication for restricted cells
        onClick={onSelect}
        onContextMenu={handleRightClick}
        style={{ minHeight: '44px' }}
        title={isDelegationRestricted ? 'Employee delegated - editing restricted after delegation date' : undefined}
      >
        {/* Time Section */}
        <div className="flex-1 flex items-center justify-center px-1">
          <TimeIntervalInput
            timeInterval={dayData.timeInterval || ''}
            status={dayData.status}
            hours={dayData.hours}
            notes={dayData.notes}
            isWeekend={isWeekend}
            readOnly={isEffectivelyReadOnly} // ✅ UPDATED: Use effective read-only state
            onTimeIntervalChange={(value) => onUpdate('timeInterval', value)}
            onFocus={onSelect}
          />
        </div>

        {/* Status Section */}
        <div className="flex items-center justify-center pb-1 relative">
          <StatusSelector
            status={dayData.status}
            timeInterval={dayData.timeInterval || ''}
            hours={dayData.hours}
            notes={dayData.notes}
            isWeekend={isWeekend}
            readOnly={isEffectivelyReadOnly} // ✅ UPDATED: Use effective read-only state
            onStatusChange={(value) => onUpdate('status', value)}
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

        {/* ✅ NEW: Delegation restriction indicator */}
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