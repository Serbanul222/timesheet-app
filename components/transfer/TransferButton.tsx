// components/transfer/TransferButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { TransferModal } from './TransferModal'
import { useTransfer } from '@/hooks/transfer/useTransfer'
import { TransferValidationRules } from '@/lib/validation/transferValidationRules'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
import { type TransferWithDetails, TRANSFER_STATUS_CONFIG } from '@/types/transfer'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'
import { toast } from 'sonner'

interface TransferButtonProps {
  employee: EmployeeWithDetails
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showLabel?: boolean
  disabled?: boolean
  onSuccess?: () => void
}

export function TransferButton({
  employee,
  className = '',
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  disabled = false,
  onSuccess
}: TransferButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  
  const { 
    permissions, 
    getActiveTransfer,
    approveTransfer,
    rejectTransfer,
    cancelTransfer,
    isApproving,
    isRejecting,
    isCancelling
  } = useTransfer({ employeeId: employee.id })

  const activeTransfer = getActiveTransfer(employee.id)
  const hasActiveTransfer = !!activeTransfer

  const handleOpenModal = () => setIsModalOpen(true)
  const handleCloseModal = () => setIsModalOpen(false)

  // Handle action confirmation
  const handleActionClick = (action: 'approve' | 'reject' | 'cancel') => {
    if (!activeTransfer) {
      toast.error('Niciun transfer activ găsit')
      return
    }
    setActionType(action)
    setIsConfirmDialogOpen(true)
  }

  // Handle the actual action after confirmation
  const handleConfirmAction = async () => {
    if (!activeTransfer || !actionType) return
    
    setIsConfirmDialogOpen(false)
    
    try {
      switch (actionType) {
        case 'approve':
          await approveTransfer(activeTransfer)
          break
        case 'reject':
          await rejectTransfer(activeTransfer)
          break
        case 'cancel':
          await cancelTransfer(activeTransfer)
          break
      }
      
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Failed to perform transfer action:', error)
    } finally {
      setActionType(null)
    }
  }

  // Cancel the action
  const handleCancelAction = () => {
    setIsConfirmDialogOpen(false)
    setActionType(null)
  }

  // Get action button text and loading state
  const getActionState = () => {
    switch (actionType) {
      case 'approve':
        return { text: isApproving ? 'Se aprobă...' : 'Confirmă aprobarea', loading: isApproving }
      case 'reject':
        return { text: isRejecting ? 'Se respinge...' : 'Confirmă respingerea', loading: isRejecting }
      case 'cancel':
        return { text: isCancelling ? 'Se anulează...' : 'Confirmă anularea', loading: isCancelling }
      default:
        return { text: 'Confirmă', loading: false }
    }
  }

  // If employee has active transfer, show status and actions
  if (hasActiveTransfer && activeTransfer) {
    const statusConfig = TRANSFER_STATUS_CONFIG[activeTransfer.status]
    const isExpiringSoon = TransferValidationRules.isTransferOverdue(activeTransfer)

    return (
      <>
        <div className="flex items-center space-x-2">
          <div className="flex flex-col">
            <span className={`text-xs px-2 py-1 rounded border ${
              isExpiringSoon ? 'bg-red-100 text-red-800 border-red-300' : 
              statusConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
              statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300' :
              statusConfig.color === 'green' ? 'bg-green-100 text-green-800 border-green-300' :
              'bg-gray-100 text-gray-800 border-gray-300'
            }`}>
              {isExpiringSoon ? '⚠️ Întârziat' : `🔄 ${statusConfig.label}`}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              Transfer la: {formatDateEuropean(activeTransfer.transfer_date)}
            </span>
            <span className="text-xs text-gray-400">
              Către: {activeTransfer.to_store?.name || 'Magazin necunoscut'}
            </span>
          </div>
          
          {/* Action buttons based on transfer status and permissions */}
          <div className="flex items-center space-x-1">
            {activeTransfer.status === 'pending' && permissions.canApproveTransfer && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleActionClick('approve')}
                  disabled={isApproving}
                  className="text-green-600 hover:text-green-800 hover:bg-green-50" 
                  title="Aprobă transferul"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {showLabel && 'Aprobă'}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleActionClick('reject')}
                  disabled={isRejecting}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50" 
                  title="Respinge transferul"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {showLabel && 'Respinge'}
                </Button>
              </>
            )}
            
            {activeTransfer.status === 'pending' && activeTransfer.initiated_by === employee.id && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleActionClick('cancel')}
                disabled={isCancelling}
                className="text-orange-600 hover:text-orange-800 hover:bg-orange-50" 
                title="Anulează transferul"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {showLabel && 'Anulează'}
              </Button>
            )}
          </div>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent size="sm" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>
                Confirmare {
                  actionType === 'approve' ? 'aprobare' :
                  actionType === 'reject' ? 'respingere' :
                  'anulare'
                } transfer
              </DialogTitle>
              <DialogDescription>
                Sunteți sigur că doriți să {
                  actionType === 'approve' ? 'aprobați' :
                  actionType === 'reject' ? 'respingeți' :
                  'anulați'
                } transferul pentru <strong>{employee.full_name}</strong>?
                <br />
                <span className="text-xs text-gray-400 mt-2 block">
                  Transfer către: {activeTransfer.to_store?.name}
                  <br />
                  Data programată: {formatDateEuropean(activeTransfer.transfer_date)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancelAction}
                disabled={getActionState().loading}
              >
                Anulează
              </Button>
              <Button 
                variant="default" 
                onClick={handleConfirmAction}
                disabled={getActionState().loading}
                className={
                  actionType === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  actionType === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  'bg-orange-600 hover:bg-orange-700 text-white'
                }
              >
                {getActionState().text}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // If no active transfer, show create transfer button
  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleOpenModal} 
        disabled={disabled || !permissions.canCreateTransfer} 
        className={className} 
        title="Transferă angajat"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {showLabel && 'Transferă'}
      </Button>
      
      {isModalOpen && (
        <TransferModal
          employee={employee}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={() => {
            handleCloseModal()
            if (onSuccess) onSuccess()
          }}
        />
      )}
    </>
  )
}