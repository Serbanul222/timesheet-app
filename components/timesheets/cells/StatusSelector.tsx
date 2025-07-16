// components/timesheets/cells/StatusSelector.tsx
'use client'

import { type DayStatus } from '@/types/timesheet-grid'
import { useAbsenceTypes } from '@/hooks/validation/useAbsenceTypes'
import { useCellValidation } from '@/hooks/validation/useCellValidation'

interface StatusSelectorProps {
  status: DayStatus
  timeInterval: string
  hours: number
  notes?: string
  isWeekend?: boolean
  readOnly?: boolean
  onStatusChange: (status: DayStatus) => void
  className?: string
}

/**
 * Status selector with validation-aware options
 */
export function StatusSelector({
  status,
  timeInterval,
  hours,
  notes,
  isWeekend,
  readOnly,
  onStatusChange,
  className = ''
}: StatusSelectorProps) {
  const { absenceTypes, isLoading, getColorClass, getDisplayName } = useAbsenceTypes()
  const { getValidAbsenceOptions } = useCellValidation({
    timeInterval,
    status,
    hours,
    notes,
    isWeekend
  })
  
  const validOptions = getValidAbsenceOptions()
  
  const getStatusStyles = () => {
    const baseClasses = 'text-xs cursor-pointer focus:outline-none w-full text-center appearance-none px-1 py-0 transition-colors'
    
    if (status === 'alege') {
      return `${baseClasses} bg-white text-blue-700 border border-blue-300 border-dashed rounded hover:bg-blue-50 font-medium`
    }
    
    // Use dynamic color from database
    const colorClass = getColorClass(status)
    return `${baseClasses} ${colorClass} rounded font-semibold`
  }
  
  const getStatusDisplayText = () => {
    if (status === 'alege') return 'Alege'
    
    // Use dynamic display name from database
    const displayName = getDisplayName(status)
    
    // Shorten some names for display
    switch (status) {
      case 'dispensa':
        return 'D'
      case 'OFF':
        return 'Off'
      default:
        return displayName
    }
  }
  
  if (readOnly) {
    return (
      <span className={`${getStatusStyles()} cursor-default`}>
        {getStatusDisplayText()}
      </span>
    )
  }
  
  if (isLoading) {
    return (
      <div className="w-full h-5 bg-gray-200 animate-pulse rounded text-xs flex items-center justify-center">
        <span className="text-gray-500">...</span>
      </div>
    )
  }
  
  return (
    <div className="relative">
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as DayStatus)}
        onClick={(e) => e.stopPropagation()}
        className={`${getStatusStyles()} ${className}`}
        title={`Current: ${getDisplayName(status)}`}
      >
        {/* Always show current status even if it would be invalid for new selection */}
        {!validOptions.includes(status) && (
          <option value={status} disabled>
            {getDisplayName(status)} (Invalid)
          </option>
        )}
        
        {/* Show valid options */}
        {validOptions.map((optionCode) => {
          if (optionCode === 'alege') {
            return (
              <option key={optionCode} value={optionCode}>
                Alege
              </option>
            )
          }
          
          const absenceType = absenceTypes.find(type => type.code === optionCode)
          if (!absenceType) return null
          
          return (
            <option key={optionCode} value={optionCode}>
              {absenceType.name}
              {absenceType.requires_hours ? ' (Partial)' : ''}
            </option>
          )
        })}
      </select>
      
      {/* Dropdown arrow */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
        <svg className="h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  )
}