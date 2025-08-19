// FILE: components/delegation/DelegationButton.tsx - REWRITTEN
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { DelegationModal } from './DelegationModal'
import { useDelegation } from '@/hooks/delegation/useDelegation'
import { DelegationValidationRules } from '@/lib/validation/delegationValidationRules'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
import { toast } from 'sonner'

// ✅ Add the new optional 'onSuccess' prop to the interface
interface DelegationButtonProps {
  employee: EmployeeWithDetails
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showLabel?: boolean
  disabled?: boolean
  onSuccess?: () => void;
}

export function DelegationButton({
  employee,
  className = '',
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  disabled = false,
  onSuccess // Receive the callback
}: DelegationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { 
    permissions, 
    getActiveDelegation, 
    isEmployeeDelegated,
    revokeDelegation,
    isRevoking,
    delegations
  } = useDelegation()

  const activeDelegation = getActiveDelegation(employee.id) || 
    delegations.find(d => 
      d.employee_id === employee.id && 
      d.status === 'active' &&
      new Date(d.valid_from) <= new Date() &&
      new Date(d.valid_until) >= new Date()
    )

  const isDelegated = isEmployeeDelegated(employee.id) || !!employee.isDelegated || !!activeDelegation
  const isExpiringSoon = activeDelegation && DelegationValidationRules.isDelegationExpiringSoon(activeDelegation)

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)

  const handleRevoke = async () => {
    if (!activeDelegation) {
      toast.error('No active delegation found to revoke')
      return
    }
    const confirmed = window.confirm(`Are you sure you want to cancel the delegation for ${employee.full_name}?`)
    if (confirmed) {
      try {
        await revokeDelegation(activeDelegation.id)
        toast.success('Delegația a fost revocată cu succes!')
        if (onSuccess) onSuccess(); // ✅ Call the success callback
      } catch (error) {
        toast.error('Delegația nu a putut fi revocată')
        console.error('Failed to revoke delegation:', error)
      }
    }
  }

  if (isDelegated && activeDelegation) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex flex-col">
          <span className={`text-xs px-2 py-1 rounded ${ isExpiringSoon ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
            {isExpiringSoon ? '⚠️ Expiră curând' : '🔄 Delegat'}
          </span>
          <span className="text-xs text-gray-500 mt-1">Până la {new Date(activeDelegation.valid_until).toLocaleDateString()}</span>
          <span className="text-xs text-gray-400">De la: {activeDelegation.from_store?.name || employee.delegation?.from_store_name || 'Unknown'}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRevoke} disabled={isRevoking} className="text-red-600 hover:text-red-800 hover:bg-red-50" title="Anulează delegația">
          {isRevoking ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">{/*...spinner svg...*/}</svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
          {showLabel && (isRevoking ? 'Anulare...' : 'Anulează')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleOpenModal} disabled={disabled} className={className} title="Deleagă angajat">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
        {showLabel && 'Deleagă'}
      </Button>
      {isModalOpen && (
        <DelegationModal
          employee={employee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          // ✅ Pass the success callback to the modal.
          onSuccess={() => {
            handleCloseModal();
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </>
  )
}