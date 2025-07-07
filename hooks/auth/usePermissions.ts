'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'

export type UserRole = 'HR' | 'ASM' | 'STORE_MANAGER'

interface Permissions {
  // General permissions
  canViewAllZones: boolean
  canViewAllStores: boolean
  canManageUsers: boolean
  canBypassTimeRestrictions: boolean
  
  // Timesheet permissions
  canCreateTimesheets: boolean
  canEditTimesheets: boolean
  canDeleteTimesheets: boolean
  canViewTimesheets: boolean
  canExportTimesheets: boolean
  
  // Employee permissions
  canCreateEmployees: boolean
  canEditEmployees: boolean
  canDeleteEmployees: boolean
  canViewEmployees: boolean
  
  // Data scope
  allowedZoneIds: string[]
  allowedStoreIds: string[]
}

export function usePermissions(): Permissions & { 
  role: UserRole | null
  hasRole: (role: UserRole) => boolean
  canAccessZone: (zoneId: string) => boolean
  canAccessStore: (storeId: string) => boolean
} {
  const { profile } = useAuth()

  const permissions = useMemo((): Permissions => {
    if (!profile) {
      return {
        canViewAllZones: false,
        canViewAllStores: false,
        canManageUsers: false,
        canBypassTimeRestrictions: false,
        canCreateTimesheets: false,
        canEditTimesheets: false,
        canDeleteTimesheets: false,
        canViewTimesheets: false,
        canExportTimesheets: false,
        canCreateEmployees: false,
        canEditEmployees: false,
        canDeleteEmployees: false,
        canViewEmployees: false,
        allowedZoneIds: [],
        allowedStoreIds: []
      }
    }

    const basePermissions = {
      canViewTimesheets: true,
      canCreateTimesheets: true,
      canEditTimesheets: true,
      canViewEmployees: true,
      canCreateEmployees: true,
      canEditEmployees: true,
    }

    switch (profile.role) {
      case 'HR':
        return {
          ...basePermissions,
          // HR has full access
          canViewAllZones: true,
          canViewAllStores: true,
          canManageUsers: true,
          canBypassTimeRestrictions: true,
          canDeleteTimesheets: true,
          canExportTimesheets: true,
          canDeleteEmployees: true,
          allowedZoneIds: [], // Empty means all zones
          allowedStoreIds: [] // Empty means all stores
        }

      case 'ASM':
        return {
          ...basePermissions,
          // ASM can see their zone and all stores within it
          canViewAllZones: false,
          canViewAllStores: false,
          canManageUsers: false,
          canBypassTimeRestrictions: false,
          canDeleteTimesheets: true,
          canExportTimesheets: true,
          canDeleteEmployees: true,
          allowedZoneIds: profile.zone_id ? [profile.zone_id] : [],
          allowedStoreIds: [] // Will be populated with stores from their zone
        }

      case 'STORE_MANAGER':
        return {
          ...basePermissions,
          // Store Manager can only see their store
          canViewAllZones: false,
          canViewAllStores: false,
          canManageUsers: false,
          canBypassTimeRestrictions: false,
          canDeleteTimesheets: false,
          canExportTimesheets: false,
          canDeleteEmployees: false,
          allowedZoneIds: profile.zone_id ? [profile.zone_id] : [],
          allowedStoreIds: profile.store_id ? [profile.store_id] : []
        }

      default:
        return {
          ...basePermissions,
          canViewAllZones: false,
          canViewAllStores: false,
          canManageUsers: false,
          canBypassTimeRestrictions: false,
          canDeleteTimesheets: false,
          canExportTimesheets: false,
          canDeleteEmployees: false,
          allowedZoneIds: [],
          allowedStoreIds: []
        }
    }
  }, [profile])

  const hasRole = (role: UserRole): boolean => {
    return profile?.role === role
  }

  const canAccessZone = (zoneId: string): boolean => {
    if (!profile) return false
    
    // HR can access all zones
    if (profile.role === 'HR') return true
    
    // Others can only access zones in their allowedZoneIds
    return permissions.allowedZoneIds.length === 0 || 
           permissions.allowedZoneIds.includes(zoneId)
  }

  const canAccessStore = (storeId: string): boolean => {
    if (!profile) return false
    
    // HR can access all stores
    if (profile.role === 'HR') return true
    
    // Store managers can only access their specific store
    if (profile.role === 'STORE_MANAGER') {
      return profile.store_id === storeId
    }
    
    // ASM can access stores in their zone (this would need store zone lookup)
    // For now, we'll use the allowedStoreIds if populated
    return permissions.allowedStoreIds.length === 0 || 
           permissions.allowedStoreIds.includes(storeId)
  }

  return {
    ...permissions,
    role: profile?.role || null,
    hasRole,
    canAccessZone,
    canAccessStore
  }
} 
