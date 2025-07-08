'use client'

import { type DayStatus } from '@/types/timesheet-grid'

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
  // Get status styling - similar to your Excel example
  const getStatusStyles = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded'
    
    const sizeClasses = {
      xs: 'px-1 py-0 text-xs min-w-[16px] h-3',
      sm: 'px-1.5 py-0.5 text-xs min-w-[20px] h-4',
      md: 'px-2 py-1 text-sm min-w-[24px] h-5'
    }

    const statusStyles = {
      off: 'bg-gray-200 text-gray-600 border border-gray-300',
      CO: 'bg-red-100 text-red-700 border border-red-300',
      CM: 'bg-yellow-100 text-yellow-700 border border-yellow-300', 
      dispensa: 'bg-purple-100 text-purple-700 border border-purple-300'
    }

    return `${baseClasses} ${sizeClasses[size]} ${statusStyles[status]}`
  }

  // Get display text for status
  const getStatusText = () => {
    switch (status) {
      case 'off': return ''
      case 'CO': return 'CO'
      case 'CM': return 'CM'
      case 'dispensa': return 'D'
      default: return ''
    }
  }

  // Get tooltip text
  const getTooltipText = () => {
    switch (status) {
      case 'off': return 'Day off'
      case 'CO': return 'Concediu Odihna (Vacation)'
      case 'CM': return 'Concediu Medical (Medical Leave)'
      case 'dispensa': return 'Dispensa (Dispensation)'
      default: return ''
    }
  }

  // Don't render anything for 'off' status in xs size
  if (status === 'off' && size === 'xs') {
    return null
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