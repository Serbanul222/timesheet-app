// components/delegation/DelegationButton.tsx
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
    isRevoking
  } = useDelegation()

  // Debug info
  console.log('DelegationButton Debug:', {
    employeeName: employee.full_name,
    canCreateDelegation: permissions.canCreateDelegation,
    canRevokeDelegation: permissions.canRevokeDelegation,
    isDelegated: employee.isDelegated
  })

  // Check if employee is currently delegated
  const activeDelegation = getActiveDelegation(employee.id)
  const isDelegated = isEmployeeDelegated(employee.id)

  // Check if delegation is expiring soon
  const isExpiringSoon = activeDelegation && 
    DelegationValidationRules.isDelegationExpiringSoon(activeDelegation)

  const handleOpenModal = () => {
    console.log('Opening delegation modal for:', employee.full_name)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    console.log('Closing delegation modal')
    setIsModalOpen(false)
  }

  const handleRevoke = async () => {
    if (!activeDelegation) return

    const confirmed = window.confirm(
      `Are you sure you want to revoke the delegation for ${employee.full_name}? ` +
      `This will return the employee to their original store.`
    )

    if (confirmed) {
      try {
        await revokeDelegation(activeDelegation.id)
      } catch (error) {
        console.error('Failed to revoke delegation:', error)
      }
    }
  }

  // Show revoke button if employee is delegated
  if (isDelegated && activeDelegation) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex flex-col">
          <span className={`text-xs px-2 py-1 rounded ${
            isExpiringSoon 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {isExpiringSoon ? '⚠️ Expiring Soon' : '🔄 Delegated'}
          </span>
          <span className="text-xs text-gray-500 mt-1">
            Until {new Date(activeDelegation.valid_until).toLocaleDateString()}
          </span>
        </div>
        
        {permissions.canRevokeDelegation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevoke}
            disabled={isRevoking}
            className="text-red-600 hover:text-red-800 hover:bg-red-50"
            title="Revoke delegation"
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
          </Button>
        )}
      </div>
    )
  }

  // Always show create delegation button for testing
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
        {showLabel && 'Deplasare'}
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