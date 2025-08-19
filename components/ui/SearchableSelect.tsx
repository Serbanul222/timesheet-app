'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

// A generic option type for reusability
export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string | null // The currently selected value
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  isLoading?: boolean
  isDisabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  isLoading = false,
  isDisabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = useMemo(() => {
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [options, searchTerm])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const selectedOptionLabel = options.find(opt => opt.value === value)?.label

  if (isLoading) {
    return (
      <div className={className}>
        {label && <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>}
        <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
      </div>
    )
  }

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isDisabled}
          className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center disabled:bg-gray-50 disabled:cursor-not-allowed"
        >
          <span className={selectedOptionLabel ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOptionLabel || placeholder}
          </span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
        </button>
        
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="p-2">
              <input
                type="text"
                placeholder="Caută..."
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <ul className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className="px-4 py-2 text-sm text-gray-900 cursor-pointer hover:bg-blue-50"
                  >
                    {option.label}
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-sm text-gray-500">No results found</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}