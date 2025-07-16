// hooks/delegation/useDelegation.ts
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/auth/useAuth'
import { DelegationService } from '@/lib/services/delegationService'
import { DelegationValidationRules } from '@/lib/validation/delegationValidationRules'
import { 
  CreateDelegationRequest, 
  DelegationWithDetails, 
  DelegationFilters,
  DelegationPermissions,
  DELEGATION_CONSTANTS
} from '@/types/delegation'
import { Database } from '@/types/database'
import { toast } from 'sonner'

type Employee = Database['public']['Tables']['employees']['Row']
type Store = Database['public']['Tables']['stores']['Row']

/**
 * Hook for managing employee delegations
 */
export function useDelegation(options: { 
  employeeId?: string
  storeId?: string
  autoRefresh?: boolean
} = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  // Query for delegations
  const {
    data: delegations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['delegations', options.employeeId, options.storeId],
    queryFn: async (): Promise<DelegationWithDetails[]> => {
      const filters: DelegationFilters = {}
      
      if (options.employeeId) {
        filters.employee_id = options.employeeId
      }
      
      if (options.storeId) {
        filters.from_store_id = options.storeId
      }
      
      return DelegationService.getDelegations(filters)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: options.autoRefresh ? 1000 * 60 * 5 : false // 5 minutes if auto-refresh
  })

  // Query for available employees
  const {
    data: availableEmployees = [],
    isLoading: isLoadingEmployees
  } = useQuery({
    queryKey: ['delegation-available-employees', user?.id],
    queryFn: async (): Promise<Employee[]> => {
      if (!user) return []
      return DelegationService.getAvailableEmployees(user.id)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // Query for available stores
  const {
    data: availableStores = [],
    isLoading: isLoadingStores
  } = useQuery({
    queryKey: ['delegation-available-stores', user?.id],
    queryFn: async (): Promise<Store[]> => {
      if (!user) return []
      return DelegationService.getAvailableStores(user.id)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // Create delegation mutation
  const createDelegation = useCallback(async (request: CreateDelegationRequest) => {
    if (!user || isCreating) return

    setIsCreating(true)
    try {
      const result = await DelegationService.createDelegation(request, user.id)
      
      if (result.success) {
        toast.success('Delegation created successfully', {
          description: `Employee delegated until ${new Date(request.valid_until).toLocaleDateString()}`
        })
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['delegations'] })
        queryClient.invalidateQueries({ queryKey: ['employees'] })
        
        return result.delegation
      } else {
        toast.error('Failed to create delegation', {
          description: result.error
        })
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('useDelegation: Create delegation error:', error)
      toast.error('Failed to create delegation', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
      throw error
    } finally {
      setIsCreating(false)
    }
  }, [user, isCreating, queryClient])

  // Revoke delegation mutation
  const revokeDelegation = useCallback(async (delegationId: string) => {
    if (!user || isRevoking) return

    setIsRevoking(true)
    try {
      const result = await DelegationService.revokeDelegation(delegationId, user.id)
      
      if (result.success) {
        toast.success('Delegation revoked successfully')
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['delegations'] })
        queryClient.invalidateQueries({ queryKey: ['employees'] })
        
        return true
      } else {
        toast.error('Failed to revoke delegation', {
          description: result.error
        })
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('useDelegation: Revoke delegation error:', error)
      toast.error('Failed to revoke delegation', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred'
      })
      throw error
    } finally {
      setIsRevoking(false)
    }
  }, [user, isRevoking, queryClient])

  // Get active delegation for a specific employee
  const getActiveDelegation = useCallback((employeeId: string): DelegationWithDetails | null => {
    const now = new Date()
    
    return delegations.find(delegation => 
      delegation.employee_id === employeeId &&
      delegation.status === 'active' &&
      new Date(delegation.valid_from) <= now &&
      new Date(delegation.valid_until) >= now
    ) || null
  }, [delegations])

  // Check if employee is currently delegated
  const isEmployeeDelegated = useCallback((employeeId: string): boolean => {
    return !!getActiveDelegation(employeeId)
  }, [getActiveDelegation])

  // Get delegation permissions for current user
  const permissions = useMemo((): DelegationPermissions => {
    if (!user) {
      return {
        canCreateDelegation: false,
        canRevokeDelegation: false,
        canExtendDelegation: false,
        canViewDelegations: false,
        allowedStores: [],
        allowedZones: []
      }
    }

    const canCreateDelegation = ['HR', 'ASM', 'STORE_MANAGER'].includes(user.role)
    const canRevokeDelegation = canCreateDelegation
    const canExtendDelegation = ['HR', 'ASM'].includes(user.role)
    const canViewDelegations = canCreateDelegation

    return {
      canCreateDelegation,
      canRevokeDelegation,
      canExtendDelegation,
      canViewDelegations,
      allowedStores: availableStores.map(store => store.id),
      allowedZones: user.zone_id ? [user.zone_id] : []
    }
  }, [user, availableStores])

  // Get delegations that are expiring soon
  const expiringSoonDelegations = useMemo(() => {
    return delegations.filter(delegation => 
      DelegationValidationRules.isDelegationExpiringSoon(delegation)
    )
  }, [delegations])

  // Get active delegations
  const activeDelegations = useMemo(() => {
    return delegations.filter(delegation => 
      DelegationValidationRules.isDelegationActive(delegation)
    )
  }, [delegations])

  // Validate delegation request
  const validateDelegationRequest = useCallback(async (request: CreateDelegationRequest) => {
    if (!user) {
      return { isValid: false, error: 'User not authenticated', canDelegate: false }
    }

    try {
      // Basic client-side validation
      const now = new Date()
      const startDate = new Date(request.valid_from)
      const endDate = new Date(request.valid_until)

      if (startDate < now) {
        return { isValid: false, error: 'Start date cannot be in the past', canDelegate: false }
      }

      if (endDate <= startDate) {
        return { isValid: false, error: 'End date must be after start date', canDelegate: false }
      }

      const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (duration > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS) {
        return { 
          isValid: false, 
          error: `Delegation cannot exceed ${DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS} days`, 
          canDelegate: false 
        }
      }

      // Check for existing active delegations
      const existingDelegation = getActiveDelegation(request.employee_id)
      if (existingDelegation) {
        return { 
          isValid: false, 
          error: 'Employee already has an active delegation', 
          canDelegate: false 
        }
      }

      return { isValid: true, canDelegate: true }
    } catch (error) {
      console.error('useDelegation: Validation error:', error)
      return { 
        isValid: false, 
        error: 'Validation failed', 
        canDelegate: false 
      }
    }
  }, [user, getActiveDelegation])

  // Get default delegation end date
  const getDefaultEndDate = useCallback(() => {
    const date = new Date()
    date.setDate(date.getDate() + DELEGATION_CONSTANTS.DEFAULT_DELEGATION_DAYS)
    return date
  }, [])

  // Check if store is available for delegation
  const isStoreAvailable = useCallback((storeId: string): boolean => {
    return availableStores.some(store => store.id === storeId)
  }, [availableStores])

  // Check if employee is available for delegation
  const isEmployeeAvailable = useCallback((employeeId: string): boolean => {
    return availableEmployees.some(employee => employee.id === employeeId) &&
           !isEmployeeDelegated(employeeId)
  }, [availableEmployees, isEmployeeDelegated])

  return {
    // Data
    delegations,
    activeDelegations,
    expiringSoonDelegations,
    availableEmployees,
    availableStores,
    permissions,
    
    // State
    isLoading,
    isLoadingEmployees,
    isLoadingStores,
    isCreating,
    isRevoking,
    error,
    
    // Actions
    createDelegation,
    revokeDelegation,
    validateDelegationRequest,
    refetch,
    
    // Helpers
    getActiveDelegation,
    isEmployeeDelegated,
    isStoreAvailable,
    isEmployeeAvailable,
    getDefaultEndDate
  }
}