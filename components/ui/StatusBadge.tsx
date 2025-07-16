// components/ui/StatusBadge.tsx
'use client'

import { type DayStatus } from '@/types/timesheet-grid'
import { useAbsenceTypes } from '@/hooks/validation/useAbsenceTypes'

interface StatusBadgeProps {
  status: DayStatus
  size?: 'xs' | 'sm' | 'md'
  className?: string
}

export function StatusBadge({ 
  status, 
  size = 'sm', 
  className = '' 
}: StatusBadgeProps) {
  const { getColorClass, getDisplayName, isLoading } = useAbsenceTypes()
  
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'xs':
        return 'px-1 py-0 text-xs min-w-[18px] h-4'
      case 'sm':
        return 'px-1.5 py-0.5 text-xs min-w-[24px] h-5'
      case 'md':
        return 'px-2 py-1 text-sm min-w-[32px] h-6'
      default:
        return 'px-1.5 py-0.5 text-xs min-w-[24px] h-5'
    }
  }
  
  if (isLoading) {
    return (
      <span className={`inline-flex items-center justify-center animate-pulse bg-gray-200 rounded ${getSizeClasses(size)} ${className}`}>
        <span className="text-gray-400">...</span>
      </span>
    )
  }
  
  const getStatusStyles = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded border cursor-pointer hover:opacity-80 transition-opacity'
    const sizeClasses = getSizeClasses(size)
    
    if (status === 'alege') {
      return `${baseClasses} ${sizeClasses} bg-white text-gray-600 border-gray-400 border-dashed`
    }
    
    // Use dynamic color from database
    const colorClass = getColorClass(status)
    return `${baseClasses} ${sizeClasses} ${colorClass} font-semibold`
  }
  
  const getStatusText = () => {
    if (status === 'alege') {
      return 'Alege'
    }
    
    // Use dynamic display name from database
    const displayName = getDisplayName(status)
    
    // Shorten some common names for display
    if (status === 'dispensa') {
      return 'D'
    }
    
    if (status === 'off') {
      return 'Off'
    }
    
    return displayName
  }
  
  const getTooltipText = () => {
    if (status === 'alege') {
      return 'Selectați un status'
    }
    
    // Use full display name for tooltip
    return `${getDisplayName(status)} - Click to change status`
  }

  return (
    <span
      className={`${getStatusStyles()} ${className}`}
      title={getTooltipText()}
    >
      {getStatusText()}
    </span>
  )
}