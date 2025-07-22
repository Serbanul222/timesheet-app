// hooks/auth/usePermissions.ts - FIXED: Proper permission logic
'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'

export type UserRole = 'HR' | 'ASM' | 'STORE_MANAGER'

interface Permissions {
  canViewAllZones: boolean
  canViewAllStores: boolean
  canManageUsers: boolean
  canCreateTimesheets: boolean
  canEditTimesheets: boolean
  canDeleteTimesheets: boolean
  canViewTimesheets: boolean
  canExportTimesheets: boolean
  canCreateEmployees: boolean
  canEditEmployees: boolean
  canDeleteEmployees: boolean
  canViewEmployees: boolean
  
  // Delegation permissions
  canCreateDelegation: boolean
  canRevokeDelegation: boolean
  canExtendDelegation: boolean
  canViewDelegations: boolean
  canDelegateAcrossZones: boolean
  canApproveDelegations: boolean
}

export function usePermissions(): Permissions {
  const { profile, user, loading } = useAuth()
  
  // Extract the role safely
  const role = profile?.role as UserRole | undefined

  const permissions = useMemo((): Permissions => {
    // Wait for auth to finish loading before making permission decisions
    if (loading) {
      console.log('usePermissions: Auth still loading, granting basic access temporarily')
      return {
        canViewTimesheets: true,
        canCreateTimesheets: true,
        canEditTimesheets: true,
        canViewEmployees: true,
        canCreateEmployees: true,
        canEditEmployees: true,
        canViewAllZones: false,
        canViewAllStores: false,
        canManageUsers: false,
        canDeleteTimesheets: false,
        canExportTimesheets: false,
        canDeleteEmployees: false,
        canCreateDelegation: false,
        canRevokeDelegation: false,
        canExtendDelegation: false,
        canViewDelegations: false,
        canDelegateAcrossZones: false,
        canApproveDelegations: false,
      }
    }
    // ✅ FIX: Default permissions for any authenticated user
    const basePermissions: Permissions = {
      canViewTimesheets: true,
      canCreateTimesheets: true,
      canEditTimesheets: true,
      canViewEmployees: true,
      canCreateEmployees: true,
      canEditEmployees: true,
      canViewAllZones: false,
      canViewAllStores: false,
      canManageUsers: false,
      canDeleteTimesheets: false,
      canExportTimesheets: false,
      canDeleteEmployees: false,
      
      // Default delegation permissions
      canCreateDelegation: false,
      canRevokeDelegation: false,
      canExtendDelegation: false,
      canViewDelegations: false,
      canDelegateAcrossZones: false,
      canApproveDelegations: false,
    }

    // ✅ FIX: If user exists but no profile yet, give basic permissions
    if (user && !profile) {
      console.log('usePermissions: User exists but profile loading, granting basic access')
      return basePermissions
    }

    // ✅ FIX: If no user, deny access
    if (!user) {
      console.log('usePermissions: No user, denying all access')
      return { 
        ...basePermissions, 
        canViewTimesheets: false, 
        canCreateTimesheets: false, 
        canEditTimesheets: false, 
        canViewEmployees: false,
        canCreateEmployees: false,
        canEditEmployees: false,
      }
    }

    // ✅ FIX: If no role yet, grant basic permissions (profile might be loading)
    if (!role) {
      console.log('usePermissions: No role set, granting basic permissions')
      return basePermissions
    }

    // ✅ FIX: Role-specific permissions
    switch (role) {
      case 'HR':
        return {
          ...basePermissions,
          canViewAllZones: true,
          canViewAllStores: true,
          canManageUsers: true,
          canDeleteTimesheets: true,
          canExportTimesheets: true,
          canDeleteEmployees: true,
          
          // HR delegation permissions
          canCreateDelegation: true,
          canRevokeDelegation: true,
          canExtendDelegation: true,
          canViewDelegations: true,
          canDelegateAcrossZones: true,
          canApproveDelegations: true,
        }

      case 'ASM':
        return {
          ...basePermissions,
          canDeleteTimesheets: true,
          canExportTimesheets: true,
          canDeleteEmployees: true,
          
          // ASM delegation permissions
          canCreateDelegation: true,
          canRevokeDelegation: true,
          canExtendDelegation: true,
          canViewDelegations: true,
          canDelegateAcrossZones: false, // Only within their zone
          canApproveDelegations: true, // Can approve store manager requests
        }

      case 'STORE_MANAGER':
        return {
          ...basePermissions,
          canDeleteTimesheets: false, // Store managers can't delete
          canExportTimesheets: false,
          canDeleteEmployees: false,
          
          // Store Manager delegation permissions
          canCreateDelegation: true,
          canRevokeDelegation: true,
          canExtendDelegation: false, // Need ASM/HR approval for extensions
          canViewDelegations: true,
          canDelegateAcrossZones: false, // Only within same zone
          canApproveDelegations: false,
        }

      default:
        // ✅ FIX: Unknown role gets basic permissions
        console.log('usePermissions: Unknown role:', role, 'granting basic permissions')
        return basePermissions
    }
  }, [role, user, profile, loading])

  // ✅ DEBUG: Log permission decisions in development
  if (process.env.NODE_ENV === 'development') {
    console.log('usePermissions: Permission calculation', {
      hasUser: !!user,
      hasProfile: !!profile,
      role,
      loading,
      canViewTimesheets: permissions.canViewTimesheets,
      canCreateTimesheets: permissions.canCreateTimesheets,
      canEditTimesheets: permissions.canEditTimesheets
    })
  }

  return permissions
}