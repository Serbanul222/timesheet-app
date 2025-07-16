// components/timesheets/validation/CellValidationIndicator.tsx
'use client'

import { type ValidationResult } from '@/lib/validation/timesheetValidationRules'

interface CellValidationIndicatorProps {
  validation: ValidationResult
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Visual indicator for cell validation status
 */
export function CellValidationIndicator({ 
  validation, 
  className = '',
  size = 'sm'
}: CellValidationIndicatorProps) {
  if (validation.isValid) {
    return null
  }
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2'
      case 'md':
        return 'w-3 h-3'
      case 'lg':
        return 'w-4 h-4'
      default:
        return 'w-2 h-2'
    }
  }
  
  const getIndicatorClasses = () => {
    const baseClasses = `${getSizeClasses()} rounded-full animate-pulse`
    
    switch (validation.type) {
      case 'error':
        return `${baseClasses} bg-red-500`
      case 'warning':
        return `${baseClasses} bg-yellow-500`
      case 'info':
        return `${baseClasses} bg-blue-500`
      default:
        return `${baseClasses} bg-gray-500`
    }
  }
  
  return (
    <div 
      className={`${getIndicatorClasses()} ${className}`}
      title={validation.message}
    />
  )
}