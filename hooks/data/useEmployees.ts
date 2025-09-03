// hooks/data/useEmployees.ts - Updated to filter inactive employees
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { Database } from '@/types/database'

type Employee = Database['public']['Tables']['employees']['Row']

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
  isHistorical?: boolean
  effectiveStoreId: string
  effectiveZoneId: string | null
}

interface UseEmployeesOptions {
  storeId?: string
  includeDelegated?: boolean
  timesheetId?: string
  includeInactive?: boolean // New option to include inactive employees
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const { storeId, includeDelegated = true, timesheetId, includeInactive = false } = options

  // Determine the effective store ID
  const effectiveStoreId = storeId || (profile?.role === 'STORE_MANAGER' ? profile.store_id : '')
  
  const {
    data: employees = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employees', effectiveStoreId, profile?.role, profile?.zone_id, includeDelegated, timesheetId, includeInactive],
    queryFn: async (): Promise<EmployeeWithDetails[]> => {
      console.log('🔍 useEmployees: Fetching employees with active filter')
      
      let regularEmployees: EmployeeWithDetails[] = []
      let delegatedEmployees: EmployeeWithDetails[] = []
      let historicalEmployees: EmployeeWithDetails[] = []

      // STEP 1: Get historical employees from existing timesheet
      if (timesheetId && timesheetId.trim() !== '') {
        try {
          const { data: existingTimesheet, error: timesheetError } = await supabase
            .from('timesheets')
            .select('daily_entries')
            .eq('id', timesheetId)
            .single()

          if (timesheetError) {
            console.warn('⚠️ Could not fetch existing timesheet:', timesheetError)
          } else if (existingTimesheet?.daily_entries) {
            const dailyEntries = existingTimesheet.daily_entries as any
            
            // Extract employee IDs from the timesheet data
            let historicalEmployeeIds: string[] = []
            
            if (dailyEntries && typeof dailyEntries === 'object') {
              if (dailyEntries._employees) {
                historicalEmployeeIds = Object.keys(dailyEntries._employees)
              } else {
                historicalEmployeeIds = Object.keys(dailyEntries).filter(key => 
                  !key.startsWith('_') &&
                  typeof dailyEntries[key] === 'object' &&
                  dailyEntries[key].name
                )
              }
            }
            
            if (historicalEmployeeIds.length > 0) {
              console.log('📋 Found historical employees in timesheet:', historicalEmployeeIds)
              
              // Fetch these employees - include inactive ones for historical context
              const { data: histEmployees, error: histError } = await supabase
                .from('employees')
                .select(`
                  *,
                  store:stores(id, name),
                  zone:zones(id, name)
                `)
                .in('id', historicalEmployeeIds)
                // Note: No is_active filter here - we want historical employees even if inactive

              if (histError) {
                console.error('❌ Error fetching historical employees:', histError)
              } else if (histEmployees) {
                // Check current delegation status for each historical employee
                const now = new Date().toISOString()
                const { data: currentDelegations } = await supabase
                  .from('employee_delegations')
                  .select(`
                    id, employee_id, from_store_id, to_store_id, valid_until,
                    from_store:stores!employee_delegations_from_store_id_fkey(id, name),
                    to_store:stores!employee_delegations_to_store_id_fkey(id, name),
                    delegated_by_user:profiles!employee_delegations_delegated_by_fkey(id, full_name)
                  `)
                  .in('employee_id', historicalEmployeeIds)
                  .eq('status', 'active')
                  .lte('valid_from', now)
                  .gte('valid_until', now)

                const delegationMap = new Map(
                  currentDelegations?.map(d => [d.employee_id, d]) || []
                )

                historicalEmployees = histEmployees
                  .filter(emp => emp.is_active || includeInactive) // Filter inactive unless explicitly included
                  .map(emp => {
                    const delegation = delegationMap.get(emp.id)
                    const isDelegated = !!delegation
                    
                    return {
                      ...emp,
                      isDelegated,
                      isHistorical: true,
                      delegation: delegation ? {
                        id: delegation.id,
                        from_store_id: delegation.from_store_id,
                        from_store_name: (delegation.from_store as any)?.name || 'Unknown Store',
                        to_store_id: delegation.to_store_id,
                        valid_until: delegation.valid_until,
                        delegated_by_name: (delegation.delegated_by_user as any)?.full_name || 'Unknown'
                      } : undefined,
                      effectiveStoreId: emp.store_id,
                      effectiveZoneId: emp.zone_id
                    }
                  })

                console.log('✅ Historical employees processed:', historicalEmployees.length)
              }
            }
          }
        } catch (error) {
          console.error('❌ Error processing historical timesheet:', error)
        }
      }

      // STEP 2: Fetch current regular employees (only active ones)
      if (effectiveStoreId && effectiveStoreId.trim() !== '') {
        const now = new Date().toISOString()
        
        // Get all ACTIVE employees assigned to this store
        let employeeQuery = supabase
          .from('employees')
          .select(`
            *,
            store:stores(id, name),
            zone:zones(id, name)
          `)
          .eq('store_id', effectiveStoreId)
          .order('full_name', { ascending: true })

        // Filter by active status unless explicitly including inactive
        if (!includeInactive) {
          employeeQuery = employeeQuery.eq('is_active', true)
        }

        const { data: allStoreEmployees, error } = await employeeQuery

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

        // Create regular employees (not delegated away, not already in historical)
        const historicalIds = new Set(historicalEmployees.map(emp => emp.id))
        
        regularEmployees = (allStoreEmployees || [])
          .filter(emp => 
            !delegatedAwayEmployeeIds.has(emp.id) && 
            !historicalIds.has(emp.id)
          )
          .map(emp => ({
            ...emp,
            isDelegated: false,
            isHistorical: false,
            effectiveStoreId: emp.store_id,
            effectiveZoneId: emp.zone_id
          }))

        console.log('✅ Regular employees (active only):', regularEmployees.length)
      }

      // STEP 3: Fetch delegated employees (only active ones delegated TO this store)
      if (includeDelegated && effectiveStoreId && effectiveStoreId.trim() !== '') {
        const now = new Date().toISOString()
        
        let delegationQuery = supabase
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

        const { data: delegationsData, error: delegationError } = await delegationQuery

        if (delegationError) {
          console.error('❌ useEmployees: Delegation fetch error:', delegationError)
        } else if (delegationsData) {
            const historicalIds = new Set(historicalEmployees.map(emp => emp.id));

            delegatedEmployees = delegationsData.reduce((acc: EmployeeWithDetails[], delegation) => {
                const employeeData = Array.isArray(delegation.employee)
                    ? delegation.employee[0]
                    : delegation.employee;

                // Skip if employee is invalid, historical, or inactive (when not included)
                if (
                    !employeeData ||
                    historicalIds.has(employeeData.id) ||
                    (!employeeData.is_active && !includeInactive)
                ) {
                    return acc;
                }

                // Construct the valid EmployeeWithDetails object
                const newEmployee: EmployeeWithDetails = {
                    ...employeeData,
                    delegation: {
                        id: delegation.id,
                        from_store_id: delegation.from_store_id,
                        from_store_name: (delegation.from_store as any)?.name || 'Unknown Store',
                        to_store_id: delegation.to_store_id,
                        valid_until: delegation.valid_until,
                        delegated_by_name: (delegation.delegated_by_user as any)?.full_name || 'Unknown'
                    },
                    isDelegated: true,
                    isHistorical: false,
                    effectiveStoreId: delegation.to_store_id,
                    effectiveZoneId: employeeData.zone_id,
                };

                acc.push(newEmployee);
                return acc;
            }, []);

          console.log('🔄 Delegated employees (active only):', delegatedEmployees.length)
        }
      }

      // STEP 4: Combine all employees with historical first
      let allEmployees = [...historicalEmployees, ...regularEmployees, ...delegatedEmployees]

      // Apply role-based filtering
      if (profile?.role === 'ASM' && profile.zone_id) {
        allEmployees = allEmployees.filter(emp => 
          emp.zone_id === profile.zone_id || emp.delegation || emp.isHistorical
        )
      } else if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        allEmployees = allEmployees.filter(emp => 
          emp.store_id === profile.store_id || 
          (emp.delegation && effectiveStoreId === profile.store_id) ||
          emp.isHistorical
        )
      }

      console.log('✅ useEmployees final result (with active filter):', {
        historical: historicalEmployees.length,
        regular: regularEmployees.length,
        delegated: delegatedEmployees.length,
        total: allEmployees.length,
        activeFilter: !includeInactive,
        storeId: effectiveStoreId,
        timesheetId
      })
      
      return allEmployees

    },
    enabled: !!user && !!profile && permissions.canViewEmployees,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1
  })

  // Separate employees by type for display
  const historicalEmployees = employees.filter(emp => emp.isHistorical)
  const regularEmployees = employees.filter(emp => !emp.isDelegated && !emp.isHistorical)
  const delegatedEmployees = employees.filter(emp => emp.isDelegated && !emp.isHistorical)

  // Validation helper for timesheet saving
  const validateEmployeeForTimesheet = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) {
      return { valid: false, error: 'Employee not found' }
    }

    if (!employee.effectiveStoreId) {
      return { valid: false, error: 'Employee missing store context' }
    }

    return { 
      valid: true, 
      employee,
      context: {
        isDelegated: employee.isDelegated || false,
        isHistorical: employee.isHistorical || false,
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
    historicalEmployees,
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
    isHistoricalEmployee: (id: string) => employees.find(emp => emp.id === id)?.isHistorical || false,
    getDelegationInfo: (id: string) => employees.find(emp => emp.id === id)?.delegation,
    
    // Validation for timesheet saving
    validateEmployeeForTimesheet,
    
    // Get employee context for saving
    getEmployeeSaveContext: (id: string) => {
      const employee = employees.find(emp => emp.id === id)
      if (!employee) return null
      
      return {
        employeeId: employee.id,
        employeeName: employee.full_name,
        position: employee.position || 'Staff',
        isDelegated: employee.isDelegated || false,
        isHistorical: employee.isHistorical || false,
        effectiveStoreId: employee.effectiveStoreId,
        effectiveZoneId: employee.effectiveZoneId,
        originalStoreId: employee.store_id,
        delegation: employee.delegation
      }
    }
  }
}