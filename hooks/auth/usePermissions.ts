// hooks/auth/usePermissions.ts - Updated with delegation permissions
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
  
  // NEW: Delegation permissions
  canCreateDelegation: boolean
  canRevokeDelegation: boolean
  canExtendDelegation: boolean
  canViewDelegations: boolean
  canDelegateAcrossZones: boolean
  canApproveDelegations: boolean
}

export function usePermissions(): Permissions {
  const { profile } = useAuth()
  
  // By extracting the role (a primitive string), the useMemo hook below
  // will only re-run when the role *value* changes, not the profile object reference.
  const role = profile?.role

  const permissions = useMemo((): Permissions => {
    // Base permissions for any authenticated user.
    const basePermissions = {
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

    if (!role) {
      // Return a default (disabled) set of permissions if there's no role.
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
        return basePermissions
    }
  }, [role]) // The dependency array now contains a stable, primitive value.

  return permissions
}