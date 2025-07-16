// hooks/data/useEmployees.ts - Optimized to fetch only selected store employees
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { Database } from '@/types/database'

type Employee = Database['public']['Tables']['employees']['Row']

// Extended employee type with related data
export interface EmployeeWithDetails extends Employee {
  store?: {
    id: string
    name: string
  }
  zone?: {
    id: string
    name: string
  }
}

interface UseEmployeesOptions {
  storeId?: string // Required store filter for efficient fetching
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const { storeId } = options

  // Determine the effective store ID to fetch employees for
  const effectiveStoreId = storeId || (profile?.role === 'STORE_MANAGER' ? profile.store_id : '')
  
  // Query to fetch employees - only when store is selected
  const {
    data: employees = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employees', effectiveStoreId, profile?.role, profile?.zone_id],
    queryFn: async (): Promise<EmployeeWithDetails[]> => {
      console.log('useEmployees: Fetching employees for store:', effectiveStoreId)
      
      let query = supabase
        .from('employees')
        .select(`
          *,
          store:stores(id, name),
          zone:zones(id, name)
        `)
        .order('full_name', { ascending: true })

      // Always filter by store if we have one
      if (effectiveStoreId && effectiveStoreId.trim() !== '') {
        query = query.eq('store_id', effectiveStoreId)
        console.log('useEmployees: Filtering by store_id:', effectiveStoreId)
      } else if (profile?.role === 'ASM' && profile.zone_id) {
        // ASM can see all employees in their zone (multiple stores)
        query = query.eq('zone_id', profile.zone_id)
        console.log('useEmployees: Filtering by zone_id:', profile.zone_id)
      } else if (profile?.role === 'HR') {
        // HR can see all employees, but we still want to filter by store when one is selected
        console.log('useEmployees: HR - no additional filtering')
      } else {
        // No store selected and not ASM/HR - return empty array
        console.log('useEmployees: No store selected, returning empty array')
        return []
      }

      const { data, error } = await query

      if (error) {
        console.error('useEmployees: Fetch error:', error)
        throw error
      }

      console.log('useEmployees: Fetched', data?.length || 0, 'employees')
      return data || []
    },
    enabled: !!user && !!profile && permissions.canViewEmployees,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  })

  return {
    employees,
    isLoading,
    error,
    refetch,
    canView: permissions.canViewEmployees,
    canCreate: permissions.canCreateEmployees,
    canEdit: permissions.canEditEmployees,
    canDelete: permissions.canDeleteEmployees,
    hasStoreSelected: !!effectiveStoreId
  }
}