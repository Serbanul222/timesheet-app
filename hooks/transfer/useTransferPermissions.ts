// hooks/transfer/useTransferPermissions.ts
'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/auth/useAuth'
import { TransferValidationRules } from '@/lib/validation/transferValidationRules'
import { TransferPermissions } from '@/types/transfer'

/**
 * Hook for transfer permissions based on user role
 * Separated for clarity and reusability
 */
export function useTransferPermissions(): TransferPermissions & {
  isLoading: boolean
  scope: 'store' | 'zone' | 'company' | 'none'
  storeId?: string
  zoneId?: string
} {
  const { user, profile } = useAuth()

  // Query for user's transfer scope
  const {
    data: transferScope,
    isLoading
  } = useQuery({
    queryKey: ['transfer-user-scope', user?.id],
    queryFn: async () => {
      if (!user) return null
      return TransferValidationRules.getUserTransferScope(user.id)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // 10 minutes - permissions don't change often
  })

  // Compute permissions based on user profile and scope
  const permissions = useMemo((): TransferPermissions & {
    isLoading: boolean
    scope: 'store' | 'zone' | 'company' | 'none'
    storeId?: string
    zoneId?: string
  } => {
    if (!user || !profile || isLoading || !transferScope) {
      return {
        canCreateTransfer: false,
        canApproveTransfer: false,
        canRejectTransfer: false,
        canCancelTransfer: false,
        canViewTransfers: false,
        allowedStores: [],
        allowedZones: [],
        isLoading: isLoading,
        scope: 'none'
      }
    }

    const userRole = profile.role as string | undefined
    
    // Base permissions based on role
    const basePermissions = {
      canCreateTransfer: ['HR', 'ASM', 'STORE_MANAGER'].includes(userRole || ''),
      canApproveTransfer: ['HR', 'ASM', 'STORE_MANAGER'].includes(userRole || ''),
      canRejectTransfer: ['HR', 'ASM', 'STORE_MANAGER'].includes(userRole || ''),
      canCancelTransfer: true, // Anyone can cancel their own transfers
      canViewTransfers: ['HR', 'ASM', 'STORE_MANAGER'].includes(userRole || ''),
      isLoading: false
    }

    // Role-specific scope and allowed stores/zones
    switch (userRole) {
      case 'HR':
        return {
          ...basePermissions,
          scope: 'company',
          allowedStores: [], // Will be populated by available stores query
          allowedZones: []   // Will be populated by available zones query
        }

      case 'ASM':
        return {
          ...basePermissions,
          scope: 'zone',
          zoneId: profile.zone_id || undefined,
          allowedStores: [], // Stores in their zone
          allowedZones: profile.zone_id ? [profile.zone_id] : []
        }

      case 'STORE_MANAGER':
        return {
          ...basePermissions,
          scope: 'store',
          storeId: profile.store_id || undefined,
          zoneId: profile.zone_id || undefined,
          allowedStores: [], // Stores in their zone
          allowedZones: profile.zone_id ? [profile.zone_id] : []
        }

      default:
        return {
          ...basePermissions,
          canCreateTransfer: false,
          canApproveTransfer: false,
          canRejectTransfer: false,
          canViewTransfers: false,
          scope: 'none',
          allowedStores: [],
          allowedZones: []
        }
    }
  }, [user, profile, isLoading, transferScope])

  return permissions
}

/**
 * Hook to check if user can perform specific transfer action
 */
export function useTransferActionPermissions() {
  const { user, profile } = useAuth()
  const permissions = useTransferPermissions()

  const canInitiateTransfer = useMemo(() => {
    return permissions.canCreateTransfer && !!user && !!profile
  }, [permissions.canCreateTransfer, user, profile])

  const canApproveAnyTransfer = useMemo(() => {
    return permissions.canApproveTransfer && !!user && !!profile
  }, [permissions.canApproveTransfer, user, profile])

  const canViewTransferDashboard = useMemo(() => {
    return permissions.canViewTransfers && !!user && !!profile
  }, [permissions.canViewTransfers, user, profile])

  // Check if user can transfer specific employee to specific store
  const canTransferEmployee = async (employeeId: string, toStoreId: string): Promise<boolean> => {
    if (!user || !permissions.canCreateTransfer) return false

    try {
      const validation = await TransferValidationRules.validateTransferPermissions(
        user.id,
        employeeId,
        toStoreId
      )
      return validation.isValid
    } catch (error) {
      console.error('Error checking transfer permissions:', error)
      return false
    }
  }

  // Check if user can approve specific transfer
  const canApproveSpecificTransfer = async (transferId: string): Promise<boolean> => {
    if (!user || !permissions.canApproveTransfer) return false

    try {
      // Would need to fetch transfer details first
      // This is a placeholder - in practice you'd get the transfer from your state
      return true // Simplified for now
    } catch (error) {
      console.error('Error checking approval permissions:', error)
      return false
    }
  }

  return {
    canInitiateTransfer,
    canApproveAnyTransfer,
    canViewTransferDashboard,
    canTransferEmployee,
    canApproveSpecificTransfer,
    
    // Role-based helpers
    isHR: profile?.role === 'HR',
    isASM: profile?.role === 'ASM',
    isStoreManager: profile?.role === 'STORE_MANAGER',
    
    // Scope information
    userScope: permissions.scope,
    userStoreId: permissions.storeId,
    userZoneId: permissions.zoneId
  }
}