'use client'

// export type DayStatus = 'alege' | 'off' | 'CO' | 'CM' | 'dispensa'
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
  // Get status styling - clear visual distinctions for each status
  const getStatusStyles = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded border cursor-pointer hover:opacity-80 transition-opacity'
    
    const sizeClasses = {
      xs: 'px-1 py-0 text-xs min-w-[18px] h-4',
      sm: 'px-1.5 py-0.5 text-xs min-w-[24px] h-5',
      md: 'px-2 py-1 text-sm min-w-[32px] h-6'
    }

    const statusStyles = {
      // ✅ NEW: Added a style for the 'Alege' (Choose) placeholder status
      alege: 'bg-white text-gray-600 border-gray-400 border-dashed',
      off: 'bg-gray-100 text-gray-500 border-gray-300',
      CO: 'bg-red-100 text-red-700 border-red-300 font-semibold',
      CM: 'bg-yellow-100 text-yellow-700 border-yellow-300 font-semibold', 
      dispensa: 'bg-purple-100 text-purple-700 border-purple-300 font-semibold'
    }

    // Fallback for any unexpected status
    const style = (status in statusStyles) ? statusStyles[status as keyof typeof statusStyles] : statusStyles.alege;

    return `${baseClasses} ${sizeClasses[size]} ${style}`
  }

  // Get display text for status
  const getStatusText = () => {
    switch (status) {
      // ✅ NEW: Added display text for 'Alege'
      case 'alege': return 'Alege'
      case 'off': return 'OFF'
      case 'CO': return 'CO'
      case 'CM': return 'CM'
      case 'dispensa': return 'D'
      default: return 'N/A'
    }
  }

  // Get tooltip text for better user understanding
  const getTooltipText = () => {
    switch (status) {
      // ✅ NEW: Added tooltip for 'Alege'
      case 'alege': return 'Selectați un status'
      case 'off': return 'Day off - Click to change status'
      case 'CO': return 'Concediu Odihna (Vacation) - Click to cycle'
      case 'CM': return 'Concediu Medical (Medical Leave) - Click to cycle'
      case 'dispensa': return 'Dispensa (Dispensation) - Click to cycle'
      default: return 'Click to change status'
    }
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
