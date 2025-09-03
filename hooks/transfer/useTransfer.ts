// hooks/transfer/useTransfer.ts
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/auth/useAuth'
import { TransferService } from '@/lib/services/transferService'
import { TransferValidationRules } from '@/lib/validation/transferValidationRules'
import { useTransferActions } from './useTransferActions'
import { useTransferPermissions } from './useTransferPermissions'
import { 
  CreateTransferRequest,
  TransferWithDetails,
  TransferFilters,
  TRANSFER_CONSTANTS
} from '@/types/transfer'
import { Database } from '@/types/database'
import { toast } from 'sonner'

type Employee = Database['public']['Tables']['employees']['Row']
type Store = Database['public']['Tables']['stores']['Row']

/**
 * Main hook for managing employee transfers
 * Integrates with permissions and actions hooks for modularity
 */
export function useTransfer(options: { 
  employeeId?: string
  storeId?: string
  autoRefresh?: boolean
} = {}) {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)

  // Use modular permission and action hooks
  const permissions = useTransferPermissions()
  const {
    approveTransfer,
    rejectTransfer,
    cancelTransfer,
    completeTransfer,
    isApproving,
    isRejecting,
    isCancelling,
    isCompleting
  } = useTransferActions()

  // Query for transfers
  const {
    data: transfers = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transfers', options.employeeId, options.storeId],
    queryFn: async (): Promise<TransferWithDetails[]> => {
      const filters: TransferFilters = {}
      
      if (options.employeeId) {
        filters.employee_id = options.employeeId
      }
      
      if (options.storeId) {
        filters.from_store_id = options.storeId
      }
      
      return TransferService.getTransfers(filters)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: options.autoRefresh ? 1000 * 60 * 5 : false // 5 minutes if auto-refresh
  })

  // Query for available employees (for current user's scope)
  const {
    data: availableEmployees = [],
    isLoading: isLoadingEmployees
  } = useQuery({
    queryKey: ['transfer-available-employees', user?.id],
    queryFn: async (): Promise<Employee[]> => {
      if (!user || !permissions.canCreateTransfer) return []
      
      // Get employees based on user's scope
      const scope = await TransferValidationRules.getUserTransferScope(user.id)
      
      let query = TransferService.getAvailableStores(user.id) // This will be updated to get employees
      // Note: We'd need to add getAvailableEmployees to TransferService
      
      return [] // Placeholder - would implement employee fetching based on scope
    },
    enabled: !!user && permissions.canCreateTransfer,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // Query for available stores
  const {
    data: availableStores = [],
    isLoading: isLoadingStores
  } = useQuery({
    queryKey: ['transfer-available-stores', user?.id],
    queryFn: async (): Promise<Store[]> => {
      if (!user) return []
      return TransferService.getAvailableStores(user.id)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // Create transfer function
  const createTransfer = useCallback(async (request: CreateTransferRequest) => {
    if (!user || isCreating) return

    setIsCreating(true)
    try {
      // Validate request
      const validation = await TransferValidationRules.validateTransferRequest(request)
      if (!validation.isValid) {
        toast.error('Eroare la validarea transferului', {
          description: validation.error
        })
        return
      }

      // Validate permissions
      const permissionCheck = await TransferValidationRules.validateTransferPermissions(
        user.id, 
        request.employee_id, 
        request.to_store_id
      )
      if (!permissionCheck.isValid) {
        toast.error('Eroare la permisiuni', {
          description: permissionCheck.error
        })
        return
      }

      const result = await TransferService.createTransfer(request, user.id)
      
      if (result.success) {
        toast.success('Transferul a fost creat cu succes', {
          description: `Transferul va avea loc la ${new Date(request.transfer_date).toLocaleDateString()}`
        })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['transfers'] })
        queryClient.invalidateQueries({ queryKey: ['employees'] })
        
        return result.data
      } else {
        toast.error('Eroare la crearea transferului', {
          description: result.error
        })
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('useTransfer: Create transfer error:', error)
      toast.error('Eroare la crearea transferului', {
        description: error instanceof Error ? error.message : 'A apărut o eroare neașteptată'
      })
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [user, isCreating, queryClient])

  // Get active transfer for a specific employee
  const getActiveTransfer = useCallback((employeeId: string): TransferWithDetails | null => {
    return transfers.find(transfer => 
      transfer.employee_id === employeeId &&
      ['pending', 'approved'].includes(transfer.status)
    ) || null
  }, [transfers])

  // Check if employee has pending transfer
  const hasEmployeePendingTransfer = useCallback((employeeId: string): boolean => {
    return !!transfers.find(transfer => 
      transfer.employee_id === employeeId &&
      transfer.status === 'pending'
    )
  }, [transfers])

  // Get transfers that need approval (for current user)
  const pendingApprovals = useMemo(() => {
    if (!permissions.canApproveTransfer) return []
    
    return transfers.filter(transfer => 
      transfer.status === 'pending' &&
      transfer.initiated_by !== user?.id // Cannot approve own transfer
    )
  }, [transfers, permissions.canApproveTransfer, user?.id])

  // Get transfers ready for execution
  const readyForExecution = useMemo(() => {
    return transfers.filter(transfer => 
      TransferValidationRules.isTransferReadyForExecution(transfer)
    )
  }, [transfers])

  // Get overdue transfers
  const overdueTransfers = useMemo(() => {
    return transfers.filter(transfer => 
      TransferValidationRules.isTransferOverdue(transfer)
    )
  }, [transfers])

  // Validate transfer request (for UI feedback)
  const validateTransferRequest = useCallback(async (request: CreateTransferRequest) => {
    if (!user) {
      return { isValid: false, error: 'Utilizator neautentificat', canTransfer: false }
    }

    try {
      const validation = await TransferValidationRules.validateTransferRequest(request)
      if (!validation.isValid) {
        return validation
      }

      const permissionCheck = await TransferValidationRules.validateTransferPermissions(
        user.id, 
        request.employee_id, 
        request.to_store_id
      )
      
      return permissionCheck
    } catch (error) {
      console.error('useTransfer: Validation error:', error)
      return { 
        isValid: false, 
        error: 'Eroare la validare', 
        canTransfer: false 
      }
    }
  }, [user])

  // Get default transfer date
  const getDefaultTransferDate = useCallback(() => {
    return TransferValidationRules.getDefaultTransferDate()
  }, [])

  // Check if store is available for transfer
  const isStoreAvailable = useCallback((storeId: string): boolean => {
    return availableStores.some(store => store.id === storeId)
  }, [availableStores])

  return {
    // Data
    transfers,
    pendingApprovals,
    readyForExecution,
    overdueTransfers,
    availableEmployees,
    availableStores,
    permissions,
    
    // State
    isLoading,
    isLoadingEmployees,
    isLoadingStores,
    isCreating,
    isApproving,
    isRejecting,
    isCancelling,
    isCompleting,
    error,
    
    // Actions
    createTransfer,
    approveTransfer,
    rejectTransfer,
    cancelTransfer,
    completeTransfer,
    validateTransferRequest,
    refetch,
    
    // Helpers
    getActiveTransfer,
    hasEmployeePendingTransfer,
    isStoreAvailable,
    getDefaultTransferDate
  }
}