// components/timesheets/cells/TimeIntervalInput.tsx - FIXED VERSION
'use client'

import { useState, useRef, useEffect } from 'react'
import { useCellValidation } from '@/hooks/validation/useCellValidation'
import { type DayStatus } from '@/types/timesheet-grid'

interface TimeIntervalInputProps {
  timeInterval: string
  status: DayStatus
  hours: number
  notes?: string
  isWeekend?: boolean
  readOnly?: boolean
  employeeId?: string
  cellDate?: string
  onTimeIntervalChange: (timeInterval: string) => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
  // ✅ NEW: Accept actual delegations from parent
  delegations?: Array<{
    employee_id: string
    valid_from: string
    to_store_id: string
    from_store_id: string
  }>
}

export function TimeIntervalInput({
  timeInterval,
  status,
  hours,
  notes,
  isWeekend,
  readOnly,
  employeeId,
  cellDate,
  delegations,
  onTimeIntervalChange,
  onFocus,
  onBlur,
  className = ''
}: TimeIntervalInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<NodeJS.Timeout>()
  
  // ✅ FIXED: Pass actual delegations
  const { 
    validationResult, 
    canEnterTimeInterval, 
    isDelegationRestricted: delegationRestricted
  } = useCellValidation({
    timeInterval,
    status,
    hours,
    notes,
    isWeekend,
    employeeId,
    cellDate,
    delegations: delegations || []
  })
  
  // ✅ DEBUG: Log in development to help troubleshoot
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && timeInterval && employeeId) {
      console.log(`📝 TimeInterval [${employeeId}][${cellDate}]:`, {
        timeInterval,
        hours,
        status,
        canEnterTimeInterval,
        delegationRestricted,
        validationResult: validationResult.isValid ? 'valid' : validationResult.message
      })
    }
  }, [timeInterval, hours, status, employeeId, cellDate, canEnterTimeInterval, delegationRestricted, validationResult])
  
  // ✅ FIXED: Less aggressive editing restrictions
  const startEdit = () => {
    if (readOnly) {
      console.log('Cannot edit: read-only mode')
      return
    }
    
    // ✅ CRITICAL FIX: Allow editing existing data even if delegation restricted
    // Only block NEW entries after delegation date
    if (delegationRestricted && !timeInterval.trim()) {
      console.log('Cannot edit: delegation restricted for new entries')
      return
    }
    
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    
    console.log('Starting edit mode for:', timeInterval)
    setEditValue(timeInterval)
    setIsEditing(true)
    onFocus?.()
  }
  
  const cancelEdit = () => {
    console.log('Cancelling edit')
    setIsEditing(false)
    setEditValue('')
    onBlur?.()
  }
  
  // ✅ ENHANCED: Better save logic with logging
  const saveEdit = () => {
    const trimmedValue = editValue.trim()
    
    console.log('Saving time interval:', {
      old: timeInterval,
      new: trimmedValue,
      employeeId,
      cellDate
    })
    
    // Always save - let parent components handle validation
    onTimeIntervalChange(trimmedValue)
    setIsEditing(false)
    setEditValue('')
    onBlur?.()
  }
  
  // ✅ FIXED: Delayed blur to prevent accidental saves
  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      if (isEditing) {
        saveEdit()
      }
    }, 150) // Small delay for better UX
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }
  
  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])
  
  const getInputStyles = () => {
    const baseClasses = 'w-full h-4 text-xs text-center border rounded bg-white focus:outline-none focus:ring-1 transition-colors'
    
    if (!validationResult.isValid) {
      if (validationResult.type === 'error') {
        return `${baseClasses} border-red-500 focus:ring-red-500 text-red-700`
      } else if (validationResult.type === 'warning') {
        return `${baseClasses} border-yellow-500 focus:ring-yellow-500 text-yellow-700`
      }
    }
    
    return `${baseClasses} border-gray-300 focus:ring-blue-500 text-gray-900`
  }
  
  // ✅ FIXED: Better display styling that doesn't interfere with existing data
  const getDisplayStyles = () => {
    const baseClasses = 'text-center cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors'
    
    // ✅ CRITICAL FIX: If we have existing data, show it normally regardless of validation
    if (timeInterval && timeInterval.trim()) {
      if (delegationRestricted) {
        return `${baseClasses} text-gray-600 bg-gray-50` // Slightly muted but still visible
      }
      return `${baseClasses} text-gray-900` // Normal display for existing data
    }
    
    // Only apply validation styling to empty cells
    if (!validationResult.isValid && !timeInterval) {
      if (validationResult.type === 'error') {
        return `${baseClasses} text-red-700 bg-red-50`
      } else if (validationResult.type === 'warning') {
        return `${baseClasses} text-yellow-700 bg-yellow-50`
      }
    }
    
    if (delegationRestricted) {
      return `${baseClasses} text-gray-500 bg-gray-100 cursor-not-allowed`
    }
    
    return `${baseClasses} text-gray-900`
  }
  
  // ✅ CRITICAL FIX: Always show existing data prominently
  const getDisplayContent = () => {
    // Priority 1: Always show timeInterval if it exists - this is the most important fix
    if (timeInterval && timeInterval.trim()) {
      return (
        <div className="text-xs font-medium text-gray-900">
          {timeInterval}
        </div>
      )
    }
    
    // Priority 2: Show calculated hours if available but no interval string
    if (hours > 0) {
      return (
        <div className="text-xs font-medium text-blue-600">
          {hours}h
        </div>
      )
    }
    
    // Priority 3: Show placeholder when no data
    return (
      <div className="text-xs text-gray-400">
        --
      </div>
    )
  }
  
  const getTooltipMessage = () => {
    if (delegationRestricted && !timeInterval.trim()) {
      return 'Cannot add new entries after delegation date'
    }
    
    if (delegationRestricted && timeInterval.trim()) {
      return 'Delegation restricted - limited editing'
    }
    
    if (validationResult.message && !timeInterval.trim()) {
      return validationResult.message
    }
    
    if (readOnly) {
      return 'Read-only mode'
    }
    
    return 'Double-click to edit time interval'
  }
  
  // ✅ ENHANCED: Read-only mode with better data display
  if (readOnly) {
    return (
      <div className="text-center">
        {getDisplayContent()}
        {timeInterval && hours > 0 && timeInterval !== `${hours}h` && (
          <div className="text-xs font-bold text-blue-600 mt-1">
            ({hours}h)
          </div>
        )}
      </div>
    )
  }
  
  // ✅ ENHANCED: Editing mode with better error display
  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur} // ✅ Use delayed blur
          onKeyDown={handleKeyDown}
          className={`${getInputStyles()} ${className}`}
          placeholder="9-17"
          maxLength={15}
        />
        {/* Show validation message while editing only if it's an error */}
        {!validationResult.isValid && validationResult.type === 'error' && validationResult.message && (
          <div className="absolute top-full left-0 right-0 mt-1 text-xs text-red-600 bg-white border border-red-300 rounded px-2 py-1 shadow-lg z-10">
            {validationResult.message}
          </div>
        )}
      </div>
    )
  }
  
  // ✅ MAIN DISPLAY MODE
  return (
    <div 
      className={`${getDisplayStyles()} ${className}`}
      onDoubleClick={startEdit}
      title={getTooltipMessage()}
    >
      {getDisplayContent()}
      
      {/* ✅ ENHANCED: Show calculated hours if different from interval */}
      {timeInterval && hours > 0 && timeInterval !== `${hours}h` && (
        <div className="text-xs font-bold text-blue-600">
          ({hours}h)
        </div>
      )}
      
      {/* ✅ SUBTLE: Only show validation warnings for empty cells */}
      {!validationResult.isValid && !timeInterval && validationResult.type === 'warning' && (
        <div className="text-xs mt-1 text-yellow-600">
          ⚠️
        </div>
      )}
    </div>
  )
}