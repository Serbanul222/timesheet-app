// hooks/transfer/useTransferActions.ts
'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/auth/useAuth'
import { TransferService } from '@/lib/services/transferService'
import { TransferValidationRules } from '@/lib/validation/transferValidationRules'
import { TransferWithDetails } from '@/types/transfer'
import { toast } from 'sonner'

/**
 * Hook for transfer actions (approve, reject, cancel, complete)
 * Separated for modularity and reusability
 */
export function useTransferActions() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  // Approve transfer
  const approveTransfer = useCallback(async (transfer: TransferWithDetails) => {
    if (!user || isApproving) return

    // Validate approval permissions
    const validation = await TransferValidationRules.validateApprovalPermissions(user.id, transfer)
    if (!validation.isValid) {
      toast.error('Eroare la aprobare', {
        description: validation.error
      })
      return
    }

    setIsApproving(true)
    try {
      const result = await TransferService.approveTransfer(transfer.id, user.id)
      
      if (result.success) {
        toast.success('Transferul a fost aprobat cu succes', {
          description: `${transfer.employee?.full_name} va fi transferat la ${transfer.to_store?.name}`
        })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['transfers'] })
        queryClient.invalidateQueries({ queryKey: ['employees'] })
        
        return result.data
      } else {
        toast.error('Eroare la aprobarea transferului', {
          description: result.error
        })
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('useTransferActions: Approve transfer error:', error)
      toast.error('Eroare la aprobarea transferului', {
        description: error instanceof Error ? error.message : 'A apărut o eroare neașteptată'
      })
      throw error
    } finally {
      setIsApproving(false)
    }
  }, [user, isApproving, queryClient])

  // Reject transfer
  const rejectTransfer = useCallback(async (transfer: TransferWithDetails) => {
    if (!user || isRejecting) return

    // Validate rejection permissions (same as approval)
    const validation = await TransferValidationRules.validateApprovalPermissions(user.id, transfer)
    if (!validation.isValid) {
      toast.error('Eroare la respingere', {
        description: validation.error
      })
      return
    }

    setIsRejecting(true)
    try {
      const result = await TransferService.rejectTransfer(transfer.id, user.id)
      
      if (result.success) {
        toast.success('Transferul a fost respins', {
          description: `Transferul pentru ${transfer.employee?.full_name} a fost respins`
        })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['transfers'] })
        
        return result.data
      } else {
        toast.error('Eroare la respingerea transferului', {
          description: result.error
        })
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('useTransferActions: Reject transfer error:', error)
      toast.error('Eroare la respingerea transferului', {
        description: error instanceof Error ? error.message : 'A apărut o eroare neașteptată'
      })
      throw error
    } finally {
      setIsRejecting(false)
    }
  }, [user, isRejecting, queryClient])

  // Cancel transfer (by initiator)
  const cancelTransfer = useCallback(async (transfer: TransferWithDetails) => {
    if (!user || isCancelling) return

    // Only initiator can cancel
    if (transfer.initiated_by !== user.id) {
      toast.error('Nu puteți anula acest transfer', {
        description: 'Doar cel care a inițiat transferul îl poate anula'
      })
      return
    }

    // Can only cancel pending transfers
    if (transfer.status !== 'pending') {
      toast.error('Nu se poate anula transferul', {
        description: 'Doar transferurile în așteptare pot fi anulate'
      })
      return
    }

    setIsCancelling(true)
    try {
      const result = await TransferService.cancelTransfer(transfer.id, user.id)
      
      if (result.success) {
        toast.success('Transferul a fost anulat', {
          description: `Transferul pentru ${transfer.employee?.full_name} a fost anulat`
        })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['transfers'] })
        
        return result.data
      } else {
        toast.error('Eroare la anularea transferului', {
          description: result.error
        })
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('useTransferActions: Cancel transfer error:', error)
      toast.error('Eroare la anularea transferului', {
        description: error instanceof Error ? error.message : 'A apărut o eroare neașteptată'
      })
      throw error
    } finally {
      setIsCancelling(false)
    }
  }, [user, isCancelling, queryClient])

  // Complete transfer (execute the actual transfer)
  const completeTransfer = useCallback(async (transfer: TransferWithDetails) => {
    if (!user || isCompleting) return

    // Transfer must be approved and ready for execution
    if (!TransferValidationRules.isTransferReadyForExecution(transfer)) {
      toast.error('Transferul nu poate fi executat', {
        description: 'Transferul nu este aprobat sau data nu a sosit încă'
      })
      return
    }

    setIsCompleting(true)
    try {
      const result = await TransferService.completeTransfer(transfer.id)
      
      if (result.success) {
        toast.success('Transferul a fost finalizat cu succes', {
          description: `${transfer.employee?.full_name} a fost transferat la ${transfer.to_store?.name}`
        })
        
        // Invalidate related queries - important to refresh employee data
        queryClient.invalidateQueries({ queryKey: ['transfers'] })
        queryClient.invalidateQueries({ queryKey: ['employees'] })
        
        return result.data
      } else {
        toast.error('Eroare la finalizarea transferului', {
          description: result.error
        })
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('useTransferActions: Complete transfer error:', error)
      toast.error('Eroare la finalizarea transferului', {
        description: error instanceof Error ? error.message : 'A apărut o eroare neașteptată'
      })
      throw error
    } finally {
      setIsCompleting(false)
    }
  }, [user, isCompleting, queryClient])

  // Check if user can perform specific actions on a transfer
  const canApproveTransfer = useCallback(async (transfer: TransferWithDetails): Promise<boolean> => {
    if (!user) return false
    
    const validation = await TransferValidationRules.validateApprovalPermissions(user.id, transfer)
    return validation.isValid
  }, [user])

  const canCancelTransfer = useCallback((transfer: TransferWithDetails): boolean => {
    if (!user) return false
    return transfer.initiated_by === user.id && transfer.status === 'pending'
  }, [user])

  const canCompleteTransfer = useCallback((transfer: TransferWithDetails): boolean => {
    return TransferValidationRules.isTransferReadyForExecution(transfer)
  }, [])

  return {
    // Actions
    approveTransfer,
    rejectTransfer,
    cancelTransfer,
    completeTransfer,
    
    // State
    isApproving,
    isRejecting,
    isCancelling,
    isCompleting,
    
    // Permission helpers
    canApproveTransfer,
    canCancelTransfer,
    canCompleteTransfer
  }
}