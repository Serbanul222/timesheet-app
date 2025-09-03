// components/employees/EmployeeSelector.tsx - Updated with Transfer Integration
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DelegationButton } from '@/components/delegation/DelegationButton'
import { TransferButton } from '@/components/transfer/TransferButton'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

interface EmployeeSelectorProps {
  employees: EmployeeWithDetails[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onEmployeeDelete?: (employeeId: string) => void
  showDelete?: boolean
  readOnly?: boolean
  storeId?: string
  historicalEmployees?: EmployeeWithDetails[]
  maxHeight?: string
}

export function EmployeeSelector({
  employees,
  selectedIds,
  onSelectionChange,
  onEmployeeDelete,
  showDelete = false,
  readOnly = false,
  storeId,
  historicalEmployees = [],
  maxHeight = '300px'
}: EmployeeSelectorProps) {
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null)

  const handleSelectAll = () => {
    if (readOnly) return
    const allIds = employees.map(emp => emp.id)
    onSelectionChange(allIds)
  }

  const handleClearAll = () => {
    if (readOnly) return
    onSelectionChange([])
  }

  const handleEmployeeToggle = (employeeId: string) => {
    if (readOnly) return
    
    if (selectedIds.includes(employeeId)) {
      onSelectionChange(selectedIds.filter(id => id !== employeeId))
    } else {
      onSelectionChange([...selectedIds, employeeId])
    }
  }

  const handleDelete = (employeeId: string) => {
    if (onEmployeeDelete) {
      onEmployeeDelete(employeeId)
    }
  }

  const toggleExpanded = (employeeId: string) => {
    setExpandedEmployeeId(expandedEmployeeId === employeeId ? null : employeeId)
  }

  // Helper function to refresh after delegation/transfer actions
  const handleActionSuccess = () => {
    // This could trigger a refetch in the parent component
    // For now, we'll just close the expanded view
    setExpandedEmployeeId(null)
  }

  const getEmployeeTypeIndicator = (employee: EmployeeWithDetails) => {
    if (historicalEmployees.some(hist => hist.id === employee.id)) {
      return <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">Istoric</span>
    }
    if (employee.isDelegated) {
      return <span className="text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded">Delegat</span>
    }
    return <span className="text-xs bg-green-100 text-green-800 px-1 py-0.5 rounded">Activ</span>
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nu sunt angajați disponibili pentru selecție</p>
        {storeId ? (
          <p className="text-sm mt-1">Asigurați-vă că magazinul are angajați activi</p>
        ) : (
          <p className="text-sm mt-1">Vă rugăm să selectați mai întâi un magazin</p>
        )}
      </div>
    )
  }

  return (
    <div>
      {!readOnly && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Selectează toate
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>
              Deselectează toate
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            {selectedIds.length} din {employees.length} selectați
          </div>
        </div>
      )}

      <div 
        className="border border-gray-300 rounded-md overflow-y-auto"
        style={{ maxHeight }}
      >
        <div className="divide-y divide-gray-200">
          {employees.map((employee) => {
            const isSelected = selectedIds.includes(employee.id)
            const isExpanded = expandedEmployeeId === employee.id
            
            return (
              <div key={employee.id} className="hover:bg-gray-50">
                {/* Main Employee Row */}
                <div className="flex items-center p-3">
                  {/* Checkbox */}
                  {!readOnly && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleEmployeeToggle(employee.id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  )}
                  
                  {/* Employee Info */}
                  <div className={`flex-1 ${!readOnly ? 'ml-3' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {employee.full_name}
                        </p>
                        {getEmployeeTypeIndicator(employee)}
                        {employee.isDelegated && employee.delegation && (
                          <span className="text-xs text-gray-500">
                            de la {employee.delegation.from_store_name}
                          </span>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-1">
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={() => toggleExpanded(employee.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={isExpanded ? 'Închide acțiuni' : 'Deschide acțiuni'}
                        >
                          <svg 
                            className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Delete Button */}
                        {showDelete && !readOnly && onEmployeeDelete && (
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Dezactivează angajat"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {employee.position || 'Staff'} • {employee.store?.name}
                      {employee.employee_code && ` • ${employee.employee_code}`}
                    </p>
                  </div>
                </div>

                {/* Expanded Actions Panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 bg-gray-50 border-t border-gray-200">
                    <div className="pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                          Acțiuni Angajat
                        </h4>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Delegation Button */}
                        <DelegationButton
                          employee={employee}
                          size="sm"
                          showLabel={true}
                          onSuccess={handleActionSuccess}
                        />
                        
                        {/* Transfer Button - NEW INTEGRATION */}
                        <TransferButton
                          employee={employee}
                          size="sm"
                          showLabel={true}
                          onSuccess={handleActionSuccess}
                        />
                      </div>
                      
                      {/* Employee Details */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><span className="font-medium">ID:</span> {employee.id.slice(-8)}</p>
                          <p><span className="font-medium">Magazin:</span> {employee.store?.name}</p>
                          <p><span className="font-medium">Zonă:</span> {employee.zone?.name || 'Necunoscută'}</p>
                          {employee.delegation && (
                            <p><span className="font-medium">Delegat de la:</span> {employee.delegation.from_store_name}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Information Panel about Delegation vs Transfer */}
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <div className="flex items-start space-x-1">
                          <svg className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <div className="text-blue-700">
                            <p><strong>Delegare:</strong> Temporară, se întoarce automat</p>
                            <p><strong>Transfer:</strong> Permanent, necesită aprobare</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}