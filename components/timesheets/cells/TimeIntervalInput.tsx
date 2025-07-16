// components/timesheets/cells/TimeIntervalInput.tsx
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
 * Time interval input with real-time validation
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
  
  if (readOnly) {
    return (
      <div className="text-center">
        {timeInterval && (
          <div className="text-xs font-medium text-gray-900">
            {timeInterval}
          </div>
        )}
        {hours > 0 && (
          <div className="text-xs font-bold text-blue-600">
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
      {timeInterval && (
        <div className="text-xs font-medium">
          {timeInterval}
        </div>
      )}
      {hours > 0 && (
        <div className="text-xs font-bold text-blue-600">
          ({hours}h)
        </div>
      )}
      {!timeInterval && !hours && (
        <div className="text-xs text-gray-400">
          --
        </div>
      )}
    </div>
  )
}