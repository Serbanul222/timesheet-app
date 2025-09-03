// components/timesheets/EmployeeDelegationPanel.tsx - Updated with Transfer Integration
'use client'

import { DelegationButton } from '@/components/delegation/DelegationButton'
import { TransferButton } from '@/components/transfer/TransferButton'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

interface EmployeeDelegationPanelProps {
  employees: EmployeeWithDetails[]
  selectedEmployeeIds: string[]
  regularEmployees: EmployeeWithDetails[]
  delegatedEmployees: EmployeeWithDetails[]
  onDelegationChange: () => void
  onTransferChange?: () => void // NEW: Transfer callback
}

export function EmployeeDelegationPanel({
  employees,
  selectedEmployeeIds,
  regularEmployees,
  delegatedEmployees,
  onDelegationChange,
  onTransferChange // NEW: Transfer callback parameter
}: EmployeeDelegationPanelProps) {
  const permissions = usePermissions()

  if (selectedEmployeeIds.length === 0) {
    return null
  }

  const selectedEmployees = employees.filter(emp => selectedEmployeeIds.includes(emp.id))

  // NEW: Get employees with active transfers
  const employeesWithActiveTransfers = selectedEmployees.filter(emp => emp.hasActiveTransfer)

  // Handler for transfer actions
  const handleTransferChange = () => {
    if (onTransferChange) {
      onTransferChange()
    }
    // Also trigger delegation change to refresh all employee data
    onDelegationChange()
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Acțiuni Angajați</h4>
        <div className="text-xs text-gray-500 flex items-center space-x-4">
          <span>Delegare: {permissions.canCreateDelegation ? 'Da' : 'Nu'}</span>
          {/* NEW: Transfer permissions indicator */}
          <span>Transfer: {permissions.canViewEmployees ? 'Da' : 'Nu'}</span>
        </div>
      </div>

      {/* NEW: Transfer Status Summary */}
      {employeesWithActiveTransfers.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h5 className="text-sm font-medium text-amber-800">Angajați cu Transferuri Active</h5>
              <div className="text-sm text-amber-700 mt-1">
                <p>
                  {employeesWithActiveTransfers.length} angajat{employeesWithActiveTransfers.length !== 1 ? 'i' : ''} din selecție 
                  {employeesWithActiveTransfers.length === 1 ? ' are' : ' au'} transferuri în curs. 
                  Aceste transferuri sunt permanente și necesită aprobare.
                </p>
                <div className="mt-2 space-y-1">
                  {employeesWithActiveTransfers.map(emp => (
                    <div key={emp.id} className="text-xs">
                      • <strong>{emp.full_name}</strong> - Transfer {emp.transfer?.status} către {emp.transfer?.to_store_name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {selectedEmployees.map(employee => (
          <div key={employee.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
            <div className="flex items-center space-x-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {employee.full_name}
                  {employee.isDelegated && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Delegat de la {employee.delegation?.from_store_name}
                    </span>
                  )}
                  {/* NEW: Transfer status indicator */}
                  {employee.hasActiveTransfer && employee.transfer && (
                    <span className={`ml-2 text-xs px-2 py-1 rounded ${
                      employee.transfer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      employee.transfer.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Transfer {employee.transfer.status === 'pending' ? 'în așteptare' :
                              employee.transfer.status === 'approved' ? 'aprobat' :
                              employee.transfer.status}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {employee.position || 'Staff'} • {employee.store?.name}
                  {/* NEW: Show transfer destination if applicable */}
                  {employee.hasActiveTransfer && employee.transfer && (
                    <span className="text-amber-600">
                      {' '}→ {employee.transfer.to_store_name} ({new Date(employee.transfer.transfer_date).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Existing Delegation Button */}
              <DelegationButton
                employee={employee}
                size="sm"
                showLabel={true}
                onSuccess={onDelegationChange}
              />
              
              {/* NEW: Transfer Button Integration */}
              <TransferButton
                employee={employee}
                size="sm"
                showLabel={true}
                onSuccess={handleTransferChange}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Information Panel */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h5 className="text-sm font-medium text-blue-800">Diferența dintre Delegare și Transfer</h5>
            <div className="text-xs text-blue-700 mt-1 space-y-1">
              <p><strong>Delegare:</strong> Temporară, angajatul se întoarce automat la magazinul original la expirare</p>
              <p><strong>Transfer:</strong> Permanent, angajatul este mutat definitiv la noul magazin</p>
              <p><strong>Aprobare:</strong> Delegările sunt imediate, transferurile necesită aprobare de la destinație</p>
              <p><strong>Pontaje:</strong> Ambele afectează unde angajatul poate lucra în timpul perioadei respective</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}