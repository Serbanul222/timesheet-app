'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

interface EmployeeSelectorProps {
  employees: EmployeeWithDetails[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  maxHeight?: string
  className?: string
}

export function EmployeeSelector({
  employees,
  selectedIds,
  onSelectionChange,
  maxHeight = '300px',
  className = ''
}: EmployeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees
    
    const term = searchTerm.toLowerCase()
    return employees.filter(emp => 
      emp.full_name.toLowerCase().includes(term) ||
      emp.position?.toLowerCase().includes(term) ||
      emp.employee_code?.toLowerCase().includes(term)
    )
  }, [employees, searchTerm])

  // Handle individual employee selection
  const handleEmployeeToggle = (employeeId: string) => {
    const newSelection = selectedIds.includes(employeeId)
      ? selectedIds.filter(id => id !== employeeId)
      : [...selectedIds, employeeId]
    
    onSelectionChange(newSelection)
  }

  // Handle select all/none
  const handleSelectAll = () => {
    const allVisible = filteredEmployees.map(emp => emp.id)
    const allSelected = allVisible.every(id => selectedIds.includes(id))
    
    if (allSelected) {
      // Deselect all visible employees
      const newSelection = selectedIds.filter(id => !allVisible.includes(id))
      onSelectionChange(newSelection)
    } else {
      // Select all visible employees
      const newSelection = [...new Set([...selectedIds, ...allVisible])]
      onSelectionChange(newSelection)
    }
  }

  const selectedCount = selectedIds.length
  const visibleSelectedCount = filteredEmployees.filter(emp => 
    selectedIds.includes(emp.id)
  ).length

  return (
    <div className={`border border-gray-300 rounded-md ${className}`}>
      {/* Search and Actions Header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            containerClassName="flex-1 mr-3"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {visibleSelectedCount === filteredEmployees.length && filteredEmployees.length > 0
              ? 'Deselect All'
              : 'Select All'
            }
          </Button>
        </div>
        
        <div className="text-xs text-gray-600">
          {selectedCount} selected • {filteredEmployees.length} shown • {employees.length} total
        </div>
      </div>

      {/* Employee List */}
      <div 
        className="overflow-y-auto"
        style={{ maxHeight }}
      >
        {filteredEmployees.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No employees match your search' : 'No employees available'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => {
              const isSelected = selectedIds.includes(employee.id)
              
              return (
                <label
                  key={employee.id}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleEmployeeToggle(employee.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {employee.full_name}
                      </div>
                      
                      {employee.employee_code && (
                        <div className="text-xs text-gray-500 ml-2">
                          #{employee.employee_code}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-gray-600">
                        {employee.position || 'Staff'}
                      </div>
                      
                      {employee.store && (
                        <div className="text-xs text-gray-500">
                          {employee.store.name}
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Summary Footer */}
      {selectedCount > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{selectedCount}</span> employee{selectedCount !== 1 ? 's' : ''} selected
            </div>
            
            {selectedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange([])}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}