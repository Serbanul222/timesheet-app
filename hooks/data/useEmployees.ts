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

export function useEmployees() {
  const { user, profile } = useAuth()
  const permissions = usePermissions()

  // Query to fetch employees with role-based filtering
  const {
    data: employees = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employees', profile?.role, profile?.zone_id, profile?.store_id],
    queryFn: async (): Promise<EmployeeWithDetails[]> => {
      console.log('useEmployees: Fetching employees...')
      
      let query = supabase
        .from('employees')
        .select(`
          *,
          store:stores(id, name),
          zone:zones(id, name)
        `)
        .order('full_name', { ascending: true })

      // Apply role-based filtering (similar to timesheet filtering)
      if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id)
      } else if (profile?.role === 'ASM' && profile.zone_id) {
        query = query.eq('zone_id', profile.zone_id)
      }
      // HR can see all employees (no additional filter)

      const { data, error } = await query

      if (error) {
        console.error('useEmployees: Fetch error:', error)
        throw error
      }

      console.log('useEmployees: Fetched', data?.length || 0, 'employees')
      return data || []
    },
    enabled: !!user && !!profile && permissions.canViewEmployees,
    staleTime: 1000 * 60 * 10, // 10 minutes (employees don't change often)
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
    canDelete: permissions.canDeleteEmployees
  }
}