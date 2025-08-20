'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DelegationModal } from './DelegationModal'
import { useDelegation } from '@/hooks/delegation/useDelegation'
import { DelegationValidationRules } from '@/lib/validation/delegationValidationRules'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'
import { toast } from 'sonner'

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
  onSuccess
}: DelegationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  
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

  // Open confirmation dialog instead of window.confirm
  const handleRevokeClick = () => {
    if (!activeDelegation) {
      toast.error('Nicio delegație activă găsită pentru a fi revocată')
      return
    }
    setIsConfirmDialogOpen(true)
  }

  // Handle the actual revocation after confirmation
  const handleConfirmRevoke = async () => {
    setIsConfirmDialogOpen(false)
    
    try {
      await revokeDelegation(activeDelegation!.id)
      toast.success('Delegația a fost revocată cu succes!')
      if (onSuccess) onSuccess()
    } catch (error) {
      toast.error('Delegația nu a putut fi revocată')
      console.error('Failed to revoke delegation:', error)
    }
  }

  // Cancel the revocation
  const handleCancelRevoke = () => {
    setIsConfirmDialogOpen(false)
  }

  if (isDelegated && activeDelegation) {
    return (
      <>
        <div className="flex items-center space-x-2">
          <div className="flex flex-col">
            <span className={`text-xs px-2 py-1 rounded ${ isExpiringSoon ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
              {isExpiringSoon ? '⚠️ Expiră curând' : '🔄 Delegat'}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              Până la {formatDateEuropean(activeDelegation.valid_until)}
            </span>
            <span className="text-xs text-gray-400">De la: {activeDelegation.from_store?.name || employee.delegation?.from_store_name || 'Unknown'}</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRevokeClick}
            disabled={isRevoking} 
            className="text-red-600 hover:text-red-800 hover:bg-red-50" 
            title="Anulează delegația"
          >
            {isRevoking ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {showLabel && (isRevoking ? 'Anulare...' : 'Anulează')}
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent size="sm" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Confirmare anulare delegație</DialogTitle>
              <DialogDescription>
                Sunteți sigur că doriți să anulați delegația pentru <strong>{employee.full_name}</strong>?
                <br />
                <span className="text-xs text-gray-400 mt-2 block">
                  Delegația este valabilă până la {formatDateEuropean(activeDelegation.valid_until)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancelRevoke}
                disabled={isRevoking}
              >
                Anulează
              </Button>
              <Button 
                variant="default" 
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isRevoking ? 'Se anulează...' : 'Confirmă anularea'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleOpenModal} 
        disabled={disabled} 
        className={className} 
        title="Deleagă angajat"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {showLabel && 'Deleagă'}
      </Button>
      {isModalOpen && (
        <DelegationModal
          employee={employee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal();
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </>
  )
}