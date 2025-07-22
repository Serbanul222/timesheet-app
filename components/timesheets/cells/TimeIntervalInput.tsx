// components/timesheets/cells/TimeIntervalInput.tsx - ENHANCED: Better display of saved intervals
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
  onTimeIntervalChange: (timeInterval: string) => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
}

/**
 * Time interval input with real-time validation and proper display of saved intervals
 */
export function TimeIntervalInput({
  timeInterval,
  status,
  hours,
  notes,
  isWeekend,
  readOnly,
  onTimeIntervalChange,
  onFocus,
  onBlur,
  className = ''
}: TimeIntervalInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { validationResult, canEnterTimeInterval } = useCellValidation({
    timeInterval,
    status,
    hours,
    notes,
    isWeekend
  })
  
  const startEdit = () => {
    if (readOnly) return
    
    setEditValue(timeInterval)
    setIsEditing(true)
    onFocus?.()
  }
  
  const cancelEdit = () => {
    setIsEditing(false)
    setEditValue('')
    onBlur?.()
  }
  
  const saveEdit = () => {
    const trimmedValue = editValue.trim()
    
    // ✅ FIX: Always allow saving time intervals
    // Validation will catch conflicts but shouldn't prevent input
    onTimeIntervalChange(trimmedValue)
    setIsEditing(false)
    setEditValue('')
    onBlur?.()
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
  
  const getInputStyles = () => {
    const baseClasses = 'w-full h-4 text-xs text-center border rounded bg-white focus:outline-none focus:ring-1 transition-colors'
    
    if (!validationResult.isValid) {
      return `${baseClasses} border-red-500 focus:ring-red-500 text-red-700`
    }
    
    return `${baseClasses} border-gray-300 focus:ring-blue-500 text-gray-900`
  }
  
  const getDisplayStyles = () => {
    const baseClasses = 'text-center cursor-pointer hover:bg-gray-50 rounded px-1 transition-colors'
    
    if (!validationResult.isValid) {
      return `${baseClasses} text-red-700 bg-red-50`
    }
    
    return `${baseClasses} text-gray-900`
  }
  
  // ✅ ENHANCED: Better logic for displaying intervals vs hours
  const getDisplayContent = () => {
    // Priority 1: Show timeInterval if it exists (this preserves "10-12" format)
    if (timeInterval && timeInterval.trim()) {
      return (
        <div className="text-xs font-medium">
          {timeInterval}
        </div>
      )
    }
    
    // Priority 2: Show hours if they exist but no interval (legacy data)
    if (hours > 0) {
      return (
        <div className="text-xs font-medium text-blue-600">
          {hours}h
        </div>
      )
    }
    
    // Priority 3: Show placeholder if nothing
    return (
      <div className="text-xs text-gray-400">
        --
      </div>
    )
  }
  
  if (readOnly) {
    return (
      <div className="text-center">
        {getDisplayContent()}
        {/* ✅ ENHANCED: Show both interval and hours for better context in read-only mode */}
        {timeInterval && hours > 0 && (
          <div className="text-xs font-bold text-blue-600 mt-1">
            ({hours}h)
          </div>
        )}
      </div>
    )
  }
  
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={saveEdit}
        onKeyDown={handleKeyDown}
        className={`${getInputStyles()} ${className}`}
        placeholder="10-12"
        maxLength={12}
      />
    )
  }
  
  return (
    <div 
      className={`${getDisplayStyles()} ${className}`}
      onDoubleClick={startEdit}
      title={validationResult.message || 'Double-click to edit'}
    >
      {getDisplayContent()}
      {/* ✅ ENHANCED: Show calculated hours below interval for context */}
      {timeInterval && hours > 0 && (
        <div className="text-xs font-bold text-blue-600">
          ({hours}h)
        </div>
      )}
    </div>
  )
}