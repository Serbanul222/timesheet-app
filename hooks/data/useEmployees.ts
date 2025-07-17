// hooks/data/useEmployees.ts - FIXED: Exclude employees delegated away
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { Database } from '@/types/database'

type Employee = Database['public']['Tables']['employees']['Row']

// Extended employee type with related data and delegation info
export interface EmployeeWithDetails extends Employee {
  store?: {
    id: string
    name: string
  }
  zone?: {
    id: string
    name: string
  }
  delegation?: {
    id: string
    from_store_id: string
    from_store_name: string
    valid_until: string
    delegated_by_name: string
  }
  isDelegated?: boolean
}

interface UseEmployeesOptions {
  storeId?: string // Required store filter for efficient fetching
  includeDelegated?: boolean // Include employees delegated to this store
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const { storeId, includeDelegated = true } = options

  // Determine the effective store ID to fetch employees for
  const effectiveStoreId = storeId || (profile?.role === 'STORE_MANAGER' ? profile.store_id : '')
  
  // Query to fetch employees - only when store is selected
  const {
    data: employees = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employees', effectiveStoreId, profile?.role, profile?.zone_id, includeDelegated],
    queryFn: async (): Promise<EmployeeWithDetails[]> => {
      console.log('useEmployees: Fetching employees for store:', effectiveStoreId, 'includeDelegated:', includeDelegated)
      
      let regularEmployees: EmployeeWithDetails[] = []
      let delegatedEmployees: EmployeeWithDetails[] = []

      // 1. ✅ FIX: Fetch regular employees EXCLUDING those currently delegated away
      if (effectiveStoreId && effectiveStoreId.trim() !== '') {
        const now = new Date().toISOString()
        
        // First, get all employees assigned to this store
        let query = supabase
          .from('employees')
          .select(`
            *,
            store:stores(id, name),
            zone:zones(id, name)
          `)
          .eq('store_id', effectiveStoreId)
          .order('full_name', { ascending: true })

        const { data: allStoreEmployees, error } = await query

        if (error) {
          console.error('useEmployees: Fetch error:', error)
          throw error
        }

        // ✅ FIX: Get list of employees currently delegated away from this store
        const { data: delegatedAwayIds, error: delegationError } = await supabase
          .from('employee_delegations')
          .select('employee_id')
          .eq('from_store_id', effectiveStoreId)
          .eq('status', 'active')
          .lte('valid_from', now)
          .gte('valid_until', now)

        if (delegationError) {
          console.error('useEmployees: Delegation check error:', delegationError)
          // Don't throw - just log and continue
        }

        const delegatedAwayEmployeeIds = new Set(
          delegatedAwayIds?.map(d => d.employee_id) || []
        )

        // ✅ FIX: Filter out employees who are currently delegated away
        regularEmployees = (allStoreEmployees || [])
          .filter(emp => !delegatedAwayEmployeeIds.has(emp.id))
          .map(emp => ({
            ...emp,
            isDelegated: false
          }))

        console.log('useEmployees: Filtered out', delegatedAwayEmployeeIds.size, 'delegated away employees')
      }

      // 2. Fetch delegated employees (delegated TO this store) - unchanged
      if (includeDelegated && effectiveStoreId && effectiveStoreId.trim() !== '') {
        const now = new Date().toISOString()
        
        const { data: delegationsData, error: delegationError } = await supabase
          .from('employee_delegations')
          .select(`
            id,
            employee_id,
            from_store_id,
            valid_until,
            employee:employees(
              *,
              store:stores(id, name),
              zone:zones(id, name)
            ),
            from_store:stores!employee_delegations_from_store_id_fkey(id, name),
            delegated_by_user:profiles!employee_delegations_delegated_by_fkey(id, full_name)
          `)
          .eq('to_store_id', effectiveStoreId)
          .eq('status', 'active')
          .lte('valid_from', now)
          .gte('valid_until', now)

        if (delegationError) {
          console.error('useEmployees: Delegation fetch error:', delegationError)
          // Don't throw error for delegations, just log and continue
        } else if (delegationsData) {
          delegatedEmployees = delegationsData
            .filter(delegation => delegation.employee)
            .map(delegation => ({
              ...delegation.employee,
              delegation: {
                id: delegation.id,
                from_store_id: delegation.from_store_id,
                from_store_name: delegation.from_store?.name || 'Unknown Store',
                valid_until: delegation.valid_until,
                delegated_by_name: delegation.delegated_by_user?.full_name || 'Unknown'
              },
              isDelegated: true
            }))
        }
      }

      // 3. Apply role-based filtering for additional security
      let allEmployees = [...regularEmployees, ...delegatedEmployees]

      if (profile?.role === 'ASM' && profile.zone_id) {
        // ASM can see employees in their zone (including delegated ones)
        allEmployees = allEmployees.filter(emp => 
          emp.zone_id === profile.zone_id || emp.delegation
        )
      } else if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        // Store managers can see their employees + employees delegated to their store
        allEmployees = allEmployees.filter(emp => 
          emp.store_id === profile.store_id || 
          (emp.delegation && effectiveStoreId === profile.store_id)
        )
      }

      console.log('useEmployees: Final result:', {
        regular: regularEmployees.length,
        delegated: delegatedEmployees.length,
        total: allEmployees.length
      })
      
      return allEmployees

    },
    enabled: !!user && !!profile && permissions.canViewEmployees,
    staleTime: 1000 * 60 * 2, // 2 minutes (shorter for delegation updates)
    retry: 1
  })

  // Separate regular and delegated employees for display
  const regularEmployees = employees.filter(emp => !emp.isDelegated)
  const delegatedEmployees = employees.filter(emp => emp.isDelegated)

  return {
    employees,
    regularEmployees,
    delegatedEmployees,
    isLoading,
    error,
    refetch,
    canView: permissions.canViewEmployees,
    canCreate: permissions.canCreateEmployees,
    canEdit: permissions.canEditEmployees,
    canDelete: permissions.canDeleteEmployees,
    hasStoreSelected: !!effectiveStoreId,
    
    // Helper functions
    getEmployeeById: (id: string) => employees.find(emp => emp.id === id),
    isDelegatedEmployee: (id: string) => employees.find(emp => emp.id === id)?.isDelegated || false,
    getDelegationInfo: (id: string) => employees.find(emp => emp.id === id)?.delegation
  }
}