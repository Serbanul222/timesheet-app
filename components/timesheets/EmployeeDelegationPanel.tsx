
// FILE: components/timesheets/EmployeeDelegationPanel.tsx - REWRITTEN
'use client'

import { DelegationButton } from '@/components/delegation/DelegationButton'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

// ✅ Add the new 'onDelegationChange' prop to the interface
interface EmployeeDelegationPanelProps {
  employees: EmployeeWithDetails[]
  selectedEmployeeIds: string[]
  regularEmployees: EmployeeWithDetails[]
  delegatedEmployees: EmployeeWithDetails[]
  onDelegationChange: () => void;
}

export function EmployeeDelegationPanel({
  employees,
  selectedEmployeeIds,
  regularEmployees,
  delegatedEmployees,
  onDelegationChange // Receive the function
}: EmployeeDelegationPanelProps) {
  const permissions = usePermissions()

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
              
              {/* ✅ Pass the onDelegationChange function to the DelegationButton as a success callback. */}
              <DelegationButton
                employee={employee}
                size="sm"
                showLabel={true}
                onSuccess={onDelegationChange}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}