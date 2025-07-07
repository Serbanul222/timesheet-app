'use client'

import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions, type UserRole } from '@/hooks/auth/usePermissions'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requirePermission?: string
  fallback?: React.ReactNode
  showFallback?: boolean
}

// Main RoleGuard component
export function RoleGuard({ 
  children, 
  allowedRoles = [],
  requirePermission,
  fallback,
  showFallback = true
}: RoleGuardProps) {
  const { user, profile, loading } = useAuth()
  const permissions = usePermissions()

  // Don't render anything while loading
  if (loading) {
    return null
  }

  // Must be authenticated to check roles
  if (!user || !profile) {
    return showFallback ? (
      fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            Authentication required to access this content.
          </p>
        </div>
      )
    ) : null
  }

  // Check role-based access
  const hasAllowedRole = allowedRoles.length === 0 || allowedRoles.includes(profile.role)

  // Check specific permission if provided
  const hasPermission = !requirePermission || checkPermission(permissions, requirePermission)

  // Grant access if both role and permission checks pass
  if (hasAllowedRole && hasPermission) {
    return <>{children}</>
  }

  // Access denied - show fallback or nothing
  return showFallback ? (
    fallback || (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Access Restricted</p>
            <p className="text-sm text-amber-700">
              You don't have permission to view this content.
            </p>
          </div>
        </div>
      </div>
    )
  ) : null
}

// Helper function to check specific permissions
function checkPermission(permissions: any, permission: string): boolean {
  // Handle dot notation for nested permissions (e.g., "timesheets.create")
  const parts = permission.split('.')
  let current = permissions

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      return false
    }
  }

  return Boolean(current)
}

// Convenience components for common role checks
export function HROnly({ children, fallback, showFallback = true }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['HR']} fallback={fallback} showFallback={showFallback}>
      {children}
    </RoleGuard>
  )
}

export function ASMAndAbove({ children, fallback, showFallback = true }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['HR', 'ASM']} fallback={fallback} showFallback={showFallback}>
      {children}
    </RoleGuard>
  )
}

export function AllManagers({ children, fallback, showFallback = true }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard allowedRoles={['HR', 'ASM', 'STORE_MANAGER']} fallback={fallback} showFallback={showFallback}>
      {children}
    </RoleGuard>
  )
}

// Export as default as well
export default RoleGuard