// components/timesheets/validation/ValidationMessage.tsx
'use client'

import { type ValidationResult } from '@/lib/validation/timesheetValidationRules'

interface ValidationMessageProps {
  validation: ValidationResult
  className?: string
  showIcon?: boolean
}

/**
 * Reusable validation message component
 */
export function ValidationMessage({ 
  validation, 
  className = '', 
  showIcon = true 
}: ValidationMessageProps) {
  if (validation.isValid || !validation.message) {
    return null
  }
  
  const getMessageStyles = () => {
    const baseStyles = 'flex items-center text-xs px-2 py-1 rounded'
    
    switch (validation.type) {
      case 'error':
        return `${baseStyles} bg-red-50 text-red-700 border border-red-200`
      case 'warning':
        return `${baseStyles} bg-yellow-50 text-yellow-700 border border-yellow-200`
      case 'info':
        return `${baseStyles} bg-blue-50 text-blue-700 border border-blue-200`
      default:
        return `${baseStyles} bg-gray-50 text-gray-700 border border-gray-200`
    }
  }
  
  const getIcon = () => {
    if (!showIcon) return null
    
    switch (validation.type) {
      case 'error':
        return (
          <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'info':
        return (
          <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }
  
  return (
    <div className={`${getMessageStyles()} ${className}`}>
      {getIcon()}
      <span className="truncate">{validation.message}</span>
    </div>
  )
}