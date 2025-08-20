// components/ui/EuropeanDateInput.tsx
'use client'
import { useState, useEffect } from 'react'
import { formatDateEuropean, formatDateForInput } from '@/lib/utils/dateFormatting'

interface EuropeanDateInputProps {
  label: string
  value: string // ISO format (YYYY-MM-DD)
  onChange: (isoDate: string) => void
  disabled?: boolean
  placeholder?: string
  required?: boolean
  className?: string
  min?: string // Add min prop for minimum date (ISO format)
  max?: string // Optional: also add max for completeness
}

export function EuropeanDateInput({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "DD/MM/YYYY",
  required = false,
  className = "",
  min, // Add min to destructuring
  max  // Add max to destructuring
}: EuropeanDateInputProps) {
  const [manualDate, setManualDate] = useState('')

  // Sync European format when ISO value changes
  useEffect(() => {
    if (value) {
      setManualDate(formatDateEuropean(value))
    }
  }, [value])

  // Handle manual European format input
  const handleManualDateChange = (inputValue: string) => {
    setManualDate(inputValue)
   
    // Parse DD/MM/YYYY format
    const parts = inputValue.split('/')
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const [day, month, year] = parts
      const isoDate = `${year}-${month}-${day}`
      const date = new Date(isoDate)
     
      // Validate the date
      if (!isNaN(date.getTime())) {
        // Additional validation for min/max constraints
        if (min && isoDate < min) return // Don't update if before min
        if (max && isoDate > max) return // Don't update if after max
        
        onChange(isoDate)
      }
    }
  }

  // Handle date picker change
  const handleDatePickerChange = (isoDate: string) => {
    if (isoDate) {
      onChange(isoDate)
    }
  }

  // Reset to valid format on blur if input is invalid
  const handleBlur = () => {
    if (value) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        setManualDate(formatDateEuropean(date))
      }
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-900 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <div className="grid">
          {/* Visible European format input */}
          <input
            type="text"
            value={manualDate}
            onChange={(e) => handleManualDateChange(e.target.value)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className="col-start-1 row-start-1 w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
          />
          {/* Hidden date picker overlay */}
          <input
            type="date"
            value={formatDateForInput(value)}
            onChange={(e) => handleDatePickerChange(e.target.value)}
            disabled={disabled}
            min={min} // Pass min constraint to date picker
            max={max} // Pass max constraint to date picker
            className="col-start-1 row-start-1 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>
        {/* Calendar icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  )
}