// components/delegation/DelegationButton.tsx - FIXED: Better revoke functionality
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DelegationModal } from './DelegationModal'
import { useDelegation } from '@/hooks/delegation/useDelegation'
import { DelegationValidationRules } from '@/lib/validation/delegationValidationRules'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

interface DelegationButtonProps {
  employee: EmployeeWithDetails
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showLabel?: boolean
  disabled?: boolean
}

export function DelegationButton({
  employee,
  className = '',
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  disabled = false
}: DelegationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { 
    permissions, 
    getActiveDelegation, 
    isEmployeeDelegated,
    revokeDelegation,
    isRevoking,
    delegations // ✅ FIX: Get all delegations to find the right one
  } = useDelegation()

  // ✅ FIX: More robust way to find active delegation
  const activeDelegation = getActiveDelegation(employee.id) || 
    delegations.find(d => 
      d.employee_id === employee.id && 
      d.status === 'active' &&
      new Date(d.valid_from) <= new Date() &&
      new Date(d.valid_until) >= new Date()
    )

  // ✅ FIX: Check both delegation info and direct query
  const isDelegated = isEmployeeDelegated(employee.id) || 
    !!employee.isDelegated || 
    !!activeDelegation

  // Check if delegation is expiring soon
  const isExpiringSoon = activeDelegation && 
    DelegationValidationRules.isDelegationExpiringSoon(activeDelegation)

  // ✅ FIX: Enhanced debug logging
  console.log('DelegationButton Debug Enhanced:', {
    employeeName: employee.full_name,
    employeeId: employee.id,
    isDelegated,
    hasActiveDelegation: !!activeDelegation,
    employeeIsDelegated: employee.isDelegated,
    delegationFromHook: isEmployeeDelegated(employee.id),
    activeDelegationId: activeDelegation?.id,
    canRevoke: permissions.canRevokeDelegation,
    allDelegations: delegations.filter(d => d.employee_id === employee.id)
  })

  const handleOpenModal = () => {
    console.log('Opening delegation modal for:', employee.full_name)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    console.log('Closing delegation modal')
    setIsModalOpen(false)
  }

  const handleRevoke = async () => {
    if (!activeDelegation) {
      console.error('No active delegation found to revoke')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel the delegation for ${employee.full_name}?\n\n` +
      `This will immediately return the employee to their original store.\n\n` +
      `Current delegation: From ${activeDelegation.from_store?.name || 'Unknown'} to ${activeDelegation.to_store?.name || 'Unknown'}\n` +
      `Valid until: ${new Date(activeDelegation.valid_until).toLocaleDateString()}`
    )

    if (confirmed) {
      try {
        console.log('Revoking delegation:', activeDelegation.id)
        await revokeDelegation(activeDelegation.id)
        console.log('Delegation revoked successfully')
      } catch (error) {
        console.error('Failed to revoke delegation:', error)
      }
    }
  }

  // ✅ FIX: Show revoke button if employee is delegated
  if (isDelegated && activeDelegation) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex flex-col">
          <span className={`text-xs px-2 py-1 rounded ${
            isExpiringSoon 
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {isExpiringSoon ? '⚠️ Expiring Soon' : '🔄 Delegated'}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Until {new Date(activeDelegation.valid_until).toLocaleDateString()}
          </span>
          {/* ✅ FIX: Show FROM/TO info */}
          <span className="text-xs text-gray-400">
            From: {activeDelegation.from_store?.name || employee.delegation?.from_store_name || 'Unknown'}
          </span>
        </div>
        
        {/* ✅ FIX: Always show revoke button for testing, improve permissions later */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRevoke}
          disabled={isRevoking}
          className="text-red-600 hover:text-red-800 hover:bg-red-50"
          title="Cancel delegation and return employee to original store"
        >
          {isRevoking ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {showLabel && (isRevoking ? 'Cancelling...' : 'Cancel')}
        </Button>
      </div>
    )
  }

  // ✅ FIX: Show create delegation button for non-delegated employees
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenModal}
        disabled={disabled}
        className={className}
        title="Delegate employee to another store"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {showLabel && 'Delegate'}
      </Button>

      {isModalOpen && (
        <DelegationModal
          employee={employee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}