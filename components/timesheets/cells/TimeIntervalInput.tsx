'use client'

import { useState, useRef, useEffect } from 'react'
import { useCellValidation } from '@/hooks/validation/useCellValidation'
import { useAbsenceTypes } from '@/hooks/validation/useAbsenceTypes'
import { AbsenceHoursRules } from '@/lib/validation/absenceHoursRules'
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
  
  const { absenceTypes } = useAbsenceTypes()
  const safeTimeInterval = String(timeInterval || '').trim()
  
  // Check if current status is a full-day absence
  const isFullDayAbsence = AbsenceHoursRules.isFullDayAbsence(status, absenceTypes)
  
  const { 
    validationResult, 
    canEnterTimeInterval, 
    isDelegationRestricted: delegationRestricted
  } = useCellValidation({
    timeInterval: safeTimeInterval,
    status,
    hours,
    notes,
    isWeekend,
    employeeId,
    cellDate,
    delegations: delegations || []
  })
  
  const startEdit = () => {
    if (readOnly || isFullDayAbsence) return
    if (delegationRestricted && !safeTimeInterval) return
    
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    
    setEditValue(safeTimeInterval)
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
    onTimeIntervalChange(trimmedValue)
    setIsEditing(false)
    setEditValue('')
    onBlur?.()
  }
  
  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      if (isEditing) saveEdit()
    }, 150)
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
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
  
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
  
  const getDisplayStyles = () => {
    const baseClasses = 'text-center rounded px-1 transition-colors'
    
    // Full-day absence: always disabled and greyed
    if (isFullDayAbsence) {
      return `${baseClasses} bg-gray-100 text-gray-600 cursor-not-allowed`
    }
    
    // Normal interactive styles
    if (!readOnly && !delegationRestricted) {
      return `${baseClasses} cursor-pointer hover:bg-gray-50 text-gray-900`
    }
    
    return `${baseClasses} text-gray-600`
  }
  
  const getDisplayContent = () => {
    // Full-day absence: show 8h automatically
    if (isFullDayAbsence) {
      return (
        <div className="text-xs font-medium text-gray-600">
          8h
        </div>
      )
    }
    
    // Show explicit time interval
    if (safeTimeInterval) {
      return (
        <div className="text-xs font-medium text-gray-900">
          {safeTimeInterval}
        </div>
      )
    }
    
    // Show calculated hours if available
    if (hours > 0) {
      return (
        <div className="text-xs font-medium text-blue-600">
          {hours}h
        </div>
      )
    }
    
    return (
      <div className="text-xs text-gray-400">
        --
      </div>
    )
  }
  
  const getTooltipMessage = () => {
    if (isFullDayAbsence) {
      const absenceType = absenceTypes.find(type => type.code === status)
      return `${absenceType?.name || 'Absence'} - automatically counts as 8 hours`
    }
    
    if (delegationRestricted && !safeTimeInterval) {
      return 'Cannot add new entries after delegation date'
    }
    
    if (readOnly) {
      return 'Read-only mode'
    }
    
    return 'Double-click to edit time interval'
  }
  
  if (readOnly) {
    return (
      <div className="text-center">
        {getDisplayContent()}
      </div>
    )
  }
  
  if (isEditing && !isFullDayAbsence) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`${getInputStyles()} ${className}`}
          placeholder="9-17"
          maxLength={15}
        />
        {!validationResult.isValid && validationResult.type === 'error' && validationResult.message && (
          <div className="absolute top-full left-0 right-0 mt-1 text-xs text-red-600 bg-white border border-red-300 rounded px-2 py-1 shadow-lg z-10">
            {validationResult.message}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div 
      className={`${getDisplayStyles()} ${className}`}
      onDoubleClick={startEdit}
      title={getTooltipMessage()}
    >
      {getDisplayContent()}
    </div>
  )
}