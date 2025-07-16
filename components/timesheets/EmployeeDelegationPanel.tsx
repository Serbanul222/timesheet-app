// components/timesheets/EmployeeDelegationPanel.tsx
'use client'

import { DelegationButton } from '@/components/delegation/DelegationButton'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

interface EmployeeDelegationPanelProps {
  employees: EmployeeWithDetails[]
  selectedEmployeeIds: string[]
  regularEmployees: EmployeeWithDetails[]
  delegatedEmployees: EmployeeWithDetails[]
}

export function EmployeeDelegationPanel({
  employees,
  selectedEmployeeIds,
  regularEmployees,
  delegatedEmployees
}: EmployeeDelegationPanelProps) {
  const permissions = usePermissions()

  // Debug info
  console.log('EmployeeDelegationPanel Debug:', {
    canCreateDelegation: permissions.canCreateDelegation,
    selectedEmployeeIds: selectedEmployeeIds.length,
    totalEmployees: employees.length,
    regularEmployees: regularEmployees.length,
    delegatedEmployees: delegatedEmployees.length
  })

  // Always show if we have selected employees (remove permission check for now to debug)
  if (selectedEmployeeIds.length === 0) {
    return null
  }

  const selectedEmployees = employees.filter(emp => selectedEmployeeIds.includes(emp.id))

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Employee Delegation</h4>
        <div className="text-xs text-gray-500">
          Permissions: {permissions.canCreateDelegation ? 'Yes' : 'No'}
        </div>
      </div>
      <div className="space-y-2">
        {selectedEmployees.map(employee => (
          <div key={employee.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {employee.full_name}
                  {employee.isDelegated && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Delegated from {employee.delegation?.from_store_name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {employee.position || 'Staff'} • {employee.store?.name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Show delegation info for delegated employees */}
              {employee.isDelegated && employee.delegation && (
                <div className="text-xs text-gray-600">
                  Until {new Date(employee.delegation.valid_until).toLocaleDateString()}
                </div>
              )}
              
              {/* Always show delegation button for testing */}
              <DelegationButton
                employee={employee}
                size="sm"
                showLabel={true}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}