// hooks/data/useEmployees.ts - FIXED: Enhanced delegation support for timesheet saving
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { Database } from '@/types/database'

type Employee = Database['public']['Tables']['employees']['Row']

// ✅ ENHANCED: Employee type with delegation context
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
    to_store_id: string
    valid_until: string
    delegated_by_name: string
  }
  isDelegated?: boolean
  // ✅ NEW: Critical fields for timesheet saving
  effectiveStoreId: string // The store where timesheets should be saved
  effectiveZoneId: string  // The zone for timesheet context
}

interface UseEmployeesOptions {
  storeId?: string
  includeDelegated?: boolean
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const { storeId, includeDelegated = true } = options

  // Determine the effective store ID
  const effectiveStoreId = storeId || (profile?.role === 'STORE_MANAGER' ? profile.store_id : '')
  
  const {
    data: employees = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employees', effectiveStoreId, profile?.role, profile?.zone_id, includeDelegated],
    queryFn: async (): Promise<EmployeeWithDetails[]> => {
      console.log('🔍 useEmployees: Fetching for store:', effectiveStoreId, 'includeDelegated:', includeDelegated)
      
      let regularEmployees: EmployeeWithDetails[] = []
      let delegatedEmployees: EmployeeWithDetails[] = []

      // ✅ STEP 1: Fetch regular employees (excluding those delegated away)
      if (effectiveStoreId && effectiveStoreId.trim() !== '') {
        const now = new Date().toISOString()
        
        // Get all employees assigned to this store
        const { data: allStoreEmployees, error } = await supabase
          .from('employees')
          .select(`
            *,
            store:stores(id, name),
            zone:zones(id, name)
          `)
          .eq('store_id', effectiveStoreId)
          .order('full_name', { ascending: true })

        if (error) {
          console.error('❌ useEmployees: Employee fetch error:', error)
          throw error
        }

        // Get employees currently delegated away from this store
        const { data: delegatedAwayIds, error: delegationError } = await supabase
          .from('employee_delegations')
          .select('employee_id')
          .eq('from_store_id', effectiveStoreId)
          .eq('status', 'active')
          .lte('valid_from', now)
          .gte('valid_until', now)

        if (delegationError) {
          console.error('⚠️ useEmployees: Delegation check error:', delegationError)
        }

        const delegatedAwayEmployeeIds = new Set(
          delegatedAwayIds?.map(d => d.employee_id) || []
        )

        // ✅ ENHANCED: Create regular employees with proper context
        regularEmployees = (allStoreEmployees || [])
          .filter(emp => !delegatedAwayEmployeeIds.has(emp.id))
          .map(emp => ({
            ...emp,
            isDelegated: false,
            effectiveStoreId: emp.store_id, // Use original store
            effectiveZoneId: emp.zone_id    // Use original zone
          }))

        console.log('✅ Regular employees:', regularEmployees.length)
      }

      // ✅ STEP 2: Fetch delegated employees (delegated TO this store)
      if (includeDelegated && effectiveStoreId && effectiveStoreId.trim() !== '') {
        const now = new Date().toISOString()
        
        const { data: delegationsData, error: delegationError } = await supabase
          .from('employee_delegations')
          .select(`
            id,
            employee_id,
            from_store_id,
            to_store_id,
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
          console.error('❌ useEmployees: Delegation fetch error:', delegationError)
        } else if (delegationsData) {
          // ✅ ENHANCED: Create delegated employees with proper context
          delegatedEmployees = delegationsData
            .filter(delegation => delegation.employee)
            .map(delegation => ({
              ...delegation.employee,
              delegation: {
                id: delegation.id,
                from_store_id: delegation.from_store_id,
                from_store_name: delegation.from_store?.name || 'Unknown Store',
                to_store_id: delegation.to_store_id,
                valid_until: delegation.valid_until,
                delegated_by_name: delegation.delegated_by_user?.full_name || 'Unknown'
              },
              isDelegated: true,
              // ✅ CRITICAL: For delegated employees, use the delegation target store
              effectiveStoreId: delegation.to_store_id,
              effectiveZoneId: delegation.employee.zone_id // Keep original zone for context
            }))

          console.log('🔄 Delegated employees:', delegatedEmployees.length)
        }
      }

      // ✅ STEP 3: Apply role-based filtering
      let allEmployees = [...regularEmployees, ...delegatedEmployees]

      if (profile?.role === 'ASM' && profile.zone_id) {
        allEmployees = allEmployees.filter(emp => 
          emp.zone_id === profile.zone_id || emp.delegation
        )
      } else if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        allEmployees = allEmployees.filter(emp => 
          emp.store_id === profile.store_id || 
          (emp.delegation && effectiveStoreId === profile.store_id)
        )
      }

      console.log('✅ useEmployees final result:', {
        regular: regularEmployees.length,
        delegated: delegatedEmployees.length,
        total: allEmployees.length,
        storeId: effectiveStoreId
      })
      
      return allEmployees

    },
    enabled: !!user && !!profile && permissions.canViewEmployees,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1
  })

  // Separate regular and delegated employees for display
  const regularEmployees = employees.filter(emp => !emp.isDelegated)
  const delegatedEmployees = employees.filter(emp => emp.isDelegated)

  // ✅ NEW: Validation helper for timesheet saving
  const validateEmployeeForTimesheet = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) {
      return { valid: false, error: 'Employee not found' }
    }

    // Check if employee has proper context for saving
    if (!employee.effectiveStoreId) {
      return { valid: false, error: 'Employee missing store context' }
    }

    return { 
      valid: true, 
      employee,
      context: {
        isDelegated: employee.isDelegated || false,
        effectiveStoreId: employee.effectiveStoreId,
        effectiveZoneId: employee.effectiveZoneId,
        originalStoreId: employee.store_id
      }
    }
  }

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
    getDelegationInfo: (id: string) => employees.find(emp => emp.id === id)?.delegation,
    
    // ✅ NEW: Validation for timesheet saving
    validateEmployeeForTimesheet,
    
    // ✅ NEW: Get employee context for saving
    getEmployeeSaveContext: (id: string) => {
      const employee = employees.find(emp => emp.id === id)
      if (!employee) return null
      
      return {
        employeeId: employee.id,
        employeeName: employee.full_name,
        position: employee.position || 'Staff',
        isDelegated: employee.isDelegated || false,
        effectiveStoreId: employee.effectiveStoreId,
        effectiveZoneId: employee.effectiveZoneId,
        originalStoreId: employee.store_id,
        delegation: employee.delegation
      }
    }
  }
}