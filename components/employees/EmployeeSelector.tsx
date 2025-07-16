// components/employees/EmployeeSelector.tsx - Fixed with store validation
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
  storeId?: string
}

export function EmployeeSelector({
  employees,
  selectedIds,
  onSelectionChange,
  maxHeight = '300px',
  className = '',
  storeId
}: EmployeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Check if store is selected
  const hasStoreSelected = storeId && storeId.trim() !== ''
  
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
            disabled={!hasStoreSelected}
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
            disabled={!hasStoreSelected || filteredEmployees.length === 0}
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
        {/* Show store selection prompt */}
        {!hasStoreSelected ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2 0H3m2-2v-2m0-4v-2m0-4V9m0-4V3" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Store First</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please select a store from the dropdown above to view employees for that location.
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Why do I need to select a store?</p>
                  <p className="mt-1">Employees are organized by store location. Selecting a store ensures you see the correct team members and the timesheet data is properly saved to the database.</p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No employees match your search' : 'No employees available for this store'}
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
      {selectedCount > 0 && hasStoreSelected && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{selectedCount}</span> employee{selectedCount !== 1 ? 's' : ''} selected
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}