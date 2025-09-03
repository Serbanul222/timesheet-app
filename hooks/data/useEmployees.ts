// hooks/data/useEmployees.ts - Updated with Transfer Integration
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { Database } from '@/types/database'

type Employee = Database['public']['Tables']['employees']['Row']
type SupabaseClient = typeof supabase

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
  // NEW: Transfer status integration
  transfer?: {
    id: string
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
    to_store_id: string
    to_store_name: string
    transfer_date: string
    initiated_by_name: string
  }
  isDelegated?: boolean
  isHistorical?: boolean
  hasActiveTransfer?: boolean // NEW: Transfer status flag
  effectiveStoreId: string
  effectiveZoneId: string | null
}

interface UseEmployeesOptions {
  storeId?: string
  includeDelegated?: boolean
  timesheetId?: string
  includeInactive?: boolean
}

// --- Helper Functions for Data Fetching ---

/**
 * STEP 1: Fetches employees listed in a previous timesheet for historical context.
 */
async function _fetchHistoricalEmployees(
  supabase: SupabaseClient,
  timesheetId: string,
  includeInactive: boolean,
): Promise<EmployeeWithDetails[]> {
  if (!timesheetId || timesheetId.trim() === '') {
    return []
  }

  try {
    const { data: existingTimesheet } = await supabase
      .from('timesheets')
      .select('daily_entries')
      .eq('id', timesheetId)
      .single()

    if (!existingTimesheet?.daily_entries) return []

    const dailyEntries = existingTimesheet.daily_entries as any
    let historicalEmployeeIds: string[] = []

    if (dailyEntries && typeof dailyEntries === 'object') {
      historicalEmployeeIds = dailyEntries._employees
        ? Object.keys(dailyEntries._employees)
        : Object.keys(dailyEntries).filter(key => !key.startsWith('_') && typeof dailyEntries[key] === 'object' && dailyEntries[key].name)
    }

    if (historicalEmployeeIds.length === 0) return []
    
    console.log('📋 Found historical employees in timesheet:', historicalEmployeeIds)

    const { data: histEmployees, error: histError } = await supabase
      .from('employees')
      .select('*, store:stores(id, name), zone:zones(id, name)')
      .in('id', historicalEmployeeIds)
    
    if (histError) {
      console.error('❌ Error fetching historical employees:', histError)
      return []
    }

    const now = new Date().toISOString()
    
    // Fetch current delegations for historical employees
    const { data: currentDelegations } = await supabase
      .from('employee_delegations')
      .select('id, employee_id, from_store_id, to_store_id, valid_until, from_store:stores!employee_delegations_from_store_id_fkey(id, name), to_store:stores!employee_delegations_to_store_id_fkey(id, name), delegated_by_user:profiles!employee_delegations_delegated_by_fkey(id, full_name)')
      .in('employee_id', historicalEmployeeIds)
      .eq('status', 'active')
      .lte('valid_from', now)
      .gte('valid_until', now)

    // NEW: Fetch current transfers for historical employees
    const { data: currentTransfers } = await supabase
      .from('employee_transfers')
      .select('id, employee_id, status, to_store_id, transfer_date, to_store:stores!employee_transfers_to_store_id_fkey(id, name), initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name)')
      .in('employee_id', historicalEmployeeIds)
      .in('status', ['pending', 'approved'])

    const delegationMap = new Map(currentDelegations?.map(d => [d.employee_id, d]) || [])
    const transferMap = new Map(currentTransfers?.map(t => [t.employee_id, t]) || [])

    const historicalEmployees = histEmployees
      .filter(emp => emp.is_active || includeInactive)
      .map(emp => {
        const delegation = delegationMap.get(emp.id)
        const transfer = transferMap.get(emp.id)
        
        return {
          ...emp,
          isDelegated: !!delegation,
          isHistorical: true,
          hasActiveTransfer: !!transfer,
          delegation: delegation ? {
            id: delegation.id,
            from_store_id: delegation.from_store_id,
            from_store_name: (delegation.from_store as any)?.name || 'Unknown Store',
            to_store_id: delegation.to_store_id,
            valid_until: delegation.valid_until,
            delegated_by_name: (delegation.delegated_by_user as any)?.full_name || 'Unknown'
          } : undefined,
          // NEW: Transfer information
          transfer: transfer ? {
            id: transfer.id,
            status: transfer.status,
            to_store_id: transfer.to_store_id,
            to_store_name: (transfer.to_store as any)?.name || 'Unknown Store',
            transfer_date: transfer.transfer_date,
            initiated_by_name: (transfer.initiated_by_user as any)?.full_name || 'Unknown'
          } : undefined,
          effectiveStoreId: emp.store_id,
          effectiveZoneId: emp.zone_id
        }
      })

    console.log('✅ Historical employees processed:', historicalEmployees.length)
    return historicalEmployees
  } catch (error) {
    console.error('❌ Error processing historical timesheet:', error)
    return []
  }
}

/**
 * STEP 2: Fetches regular employees for a given store, excluding those delegated away or already historical.
 */
async function _fetchRegularEmployees(
  supabase: SupabaseClient,
  storeId: string,
  includeInactive: boolean,
  historicalIds: Set<string>
): Promise<EmployeeWithDetails[]> {
  if (!storeId || storeId.trim() === '') return []

  let employeeQuery = supabase
    .from('employees')
    .select('*, store:stores(id, name), zone:zones(id, name)')
    .eq('store_id', storeId)
    .order('full_name', { ascending: true })

  if (!includeInactive) {
    employeeQuery = employeeQuery.eq('is_active', true)
  }

  const { data: allStoreEmployees, error } = await employeeQuery
  if (error) {
    console.error('❌ useEmployees: Employee fetch error:', error)
    throw error
  }

  const now = new Date().toISOString()
  
  // Fetch employees delegated away from this store
  const { data: delegatedAwayIds } = await supabase
    .from('employee_delegations')
    .select('employee_id')
    .eq('from_store_id', storeId)
    .eq('status', 'active')
    .lte('valid_from', now)
    .gte('valid_until', now)

  // NEW: Fetch employees with active transfers
  const { data: employeesWithTransfers } = await supabase
    .from('employee_transfers')
    .select('id, employee_id, status, to_store_id, transfer_date, to_store:stores!employee_transfers_to_store_id_fkey(id, name), initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name)')
    .eq('from_store_id', storeId)
    .in('status', ['pending', 'approved'])

  const delegatedAwayEmployeeIds = new Set(delegatedAwayIds?.map(d => d.employee_id) || [])
  const transferMap = new Map(employeesWithTransfers?.map(t => [t.employee_id, t]) || [])
  
  const regularEmployees = (allStoreEmployees || [])
    .filter(emp => !delegatedAwayEmployeeIds.has(emp.id) && !historicalIds.has(emp.id))
    .map(emp => {
      const transfer = transferMap.get(emp.id)
      
      return {
        ...emp,
        isDelegated: false,
        isHistorical: false,
        hasActiveTransfer: !!transfer,
        // NEW: Transfer information
        transfer: transfer ? {
          id: transfer.id,
          status: transfer.status,
          to_store_id: transfer.to_store_id,
          to_store_name: (transfer.to_store as any)?.name || 'Unknown Store',
          transfer_date: transfer.transfer_date,
          initiated_by_name: (transfer.initiated_by_user as any)?.full_name || 'Unknown'
        } : undefined,
        effectiveStoreId: emp.store_id,
        effectiveZoneId: emp.zone_id
      }
    })

  console.log('✅ Regular employees (with transfer status):', regularEmployees.length)
  return regularEmployees
}

/**
 * STEP 3: Fetches employees delegated TO a given store.
 */
async function _fetchDelegatedEmployees(
  supabase: SupabaseClient,
  storeId: string,
  includeInactive: boolean,
  historicalIds: Set<string>
): Promise<EmployeeWithDetails[]> {
  if (!storeId || storeId.trim() === '') return []

  const now = new Date().toISOString()
  const { data: delegationsData, error } = await supabase
    .from('employee_delegations')
    .select('id, employee_id, from_store_id, to_store_id, valid_until, employee:employees(*, store:stores(id, name), zone:zones(id, name)), from_store:stores!employee_delegations_from_store_id_fkey(id, name), delegated_by_user:profiles!employee_delegations_delegated_by_fkey(id, full_name)')
    .eq('to_store_id', storeId)
    .eq('status', 'active')
    .lte('valid_from', now)
    .gte('valid_until', now) as unknown as { data: Array<{
      id: string
      employee_id: string
      from_store_id: string
      to_store_id: string
      valid_until: string
      employee: any // You can replace 'any' with a more specific type if available
      from_store: any
      delegated_by_user: any
    }> | null, error: any }

  if (error) {
    console.error('❌ useEmployees: Delegation fetch error:', error)
    return []
  }

  // Get employee IDs for transfer lookup
  const delegatedEmployeeIds = (delegationsData || [])
    .map(d => Array.isArray(d.employee) ? d.employee[0]?.id : d.employee?.id)
    .filter(Boolean)

  // NEW: Fetch transfers for delegated employees
  const { data: delegatedEmployeeTransfers } = await supabase
    .from('employee_transfers')
    .select('id, employee_id, status, to_store_id, transfer_date, to_store:stores!employee_transfers_to_store_id_fkey(id, name), initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name)')
    .in('employee_id', delegatedEmployeeIds)
    .in('status', ['pending', 'approved'])

  const transferMap = new Map(delegatedEmployeeTransfers?.map(t => [t.employee_id, t]) || [])

  const delegatedEmployees = (delegationsData || []).reduce((acc: EmployeeWithDetails[], delegation) => {
    const employeeData = Array.isArray(delegation.employee) ? delegation.employee[0] : delegation.employee
    if (!employeeData || historicalIds.has(employeeData.id) || (!employeeData.is_active && !includeInactive)) {
      return acc
    }
    
    const transfer = transferMap.get(employeeData.id)
    
    acc.push({
      ...employeeData,
      delegation: {
        id: delegation.id,
        from_store_id: delegation.from_store_id,
        from_store_name: (delegation.from_store as any)?.name || 'Unknown Store',
        to_store_id: delegation.to_store_id,
        valid_until: delegation.valid_until,
        delegated_by_name: (delegation.delegated_by_user as any)?.full_name || 'Unknown'
      },
      // NEW: Transfer information for delegated employees
      transfer: transfer ? {
        id: transfer.id,
        status: transfer.status,
        to_store_id: transfer.to_store_id,
        to_store_name: (transfer.to_store as any)?.name || 'Unknown Store',
        transfer_date: transfer.transfer_date,
        initiated_by_name: (transfer.initiated_by_user as any)?.full_name || 'Unknown'
      } : undefined,
      isDelegated: true,
      isHistorical: false,
      hasActiveTransfer: !!transfer,
      effectiveStoreId: delegation.to_store_id,
      effectiveZoneId: employeeData.zone_id,
    })
    return acc
  }, [])
  
  console.log('🔄 Delegated employees (with transfer status):', delegatedEmployees.length)
  return delegatedEmployees
}

/**
 * STEP 4: Applies final filtering based on the user's role.
 */
function _applyRoleBasedFiltering(employees: EmployeeWithDetails[], profile: any, effectiveStoreId: string): EmployeeWithDetails[] {
  if (profile?.role === 'ASM' && profile.zone_id) {
    return employees.filter(emp => emp.zone_id === profile.zone_id || emp.delegation || emp.isHistorical)
  }
  if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
    return employees.filter(emp => emp.store_id === profile.store_id || (emp.delegation && effectiveStoreId === profile.store_id) || emp.isHistorical)
  }
  return employees
}

// --- Main Custom Hook ---

export function useEmployees(options: UseEmployeesOptions = {}) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const { storeId, includeDelegated = true, timesheetId, includeInactive = false } = options

  const effectiveStoreId = storeId || (profile?.role === 'STORE_MANAGER' ? profile.store_id || '' : '')
  
  const {
    data: employees = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employees', effectiveStoreId, profile?.role, profile?.zone_id, includeDelegated, timesheetId, includeInactive],
    queryFn: async (): Promise<EmployeeWithDetails[]> => {
      console.log('🔍 useEmployees: Fetching employees with transfer status')

      // STEP 1: Get historical employees from existing timesheet
      const historicalEmployees = await _fetchHistoricalEmployees(supabase, timesheetId || '', includeInactive)
      const historicalIds = new Set(historicalEmployees.map(emp => emp.id))

      // STEP 2: Fetch current regular employees
      const regularEmployees = await _fetchRegularEmployees(supabase, effectiveStoreId, includeInactive, historicalIds)
      
      // STEP 3: Fetch delegated employees
      const delegatedEmployees = includeDelegated 
        ? await _fetchDelegatedEmployees(supabase, effectiveStoreId, includeInactive, historicalIds) 
        : []

      // STEP 4: Combine and apply role-based filtering
      let allEmployees = [...historicalEmployees, ...regularEmployees, ...delegatedEmployees]
      allEmployees = _applyRoleBasedFiltering(allEmployees, profile, effectiveStoreId)

      console.log('✅ useEmployees final result (with transfer status):', {
        historical: historicalEmployees.length,
        regular: regularEmployees.length,
        delegated: delegatedEmployees.length,
        total: allEmployees.length,
        withActiveTransfers: allEmployees.filter(emp => emp.hasActiveTransfer).length,
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

  // NEW: Helper for employees with active transfers
  const employeesWithActiveTransfers = employees.filter(emp => emp.hasActiveTransfer)

  // Validation helper for timesheet saving
  const validateEmployeeForTimesheet = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (!employee) {
      return { valid: false, error: 'Employee not found' }
    }
    if (!employee.effectiveStoreId) {
      return { valid: false, error: 'Employee missing store context' }
    }
    // NEW: Check if employee has active transfer that might affect timesheet
    if (employee.hasActiveTransfer && employee.transfer?.status === 'approved') {
      return { 
        valid: true, 
        warning: 'Employee has approved transfer - timesheet may be affected',
        employee,
        context: {
          isDelegated: employee.isDelegated || false,
          isHistorical: employee.isHistorical || false,
          hasActiveTransfer: employee.hasActiveTransfer || false,
          transferStatus: employee.transfer?.status,
          effectiveStoreId: employee.effectiveStoreId,
          effectiveZoneId: employee.effectiveZoneId,
          originalStoreId: employee.store_id
        }
      }
    }
    
    return { 
      valid: true, 
      employee,
      context: {
        isDelegated: employee.isDelegated || false,
        isHistorical: employee.isHistorical || false,
        hasActiveTransfer: employee.hasActiveTransfer || false,
        transferStatus: employee.transfer?.status,
        effectiveStoreId: employee.effectiveStoreId,
        effectiveZoneId: employee.effectiveZoneId,
        originalStoreId: employee.store_id
      }
    }
  }

  return {
    // Data
    employees,
    regularEmployees,
    delegatedEmployees,
    historicalEmployees,
    employeesWithActiveTransfers, // NEW: Employees with active transfers
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
    hasActiveTransfer: (id: string) => employees.find(emp => emp.id === id)?.hasActiveTransfer || false, // NEW
    getDelegationInfo: (id: string) => employees.find(emp => emp.id === id)?.delegation,
    getTransferInfo: (id: string) => employees.find(emp => emp.id === id)?.transfer, // NEW
    
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
        hasActiveTransfer: employee.hasActiveTransfer || false, // NEW
        effectiveStoreId: employee.effectiveStoreId,
        effectiveZoneId: employee.effectiveZoneId,
        originalStoreId: employee.store_id,
        delegation: employee.delegation,
        transfer: employee.transfer // NEW
      }
    }
  }
}