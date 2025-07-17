// hooks/timesheets/useTimesheetStatsData.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'


interface DashboardFilters {
  period: 'week' | 'month' | 'quarter'
  storeId?: string
  zoneId?: string
  startDate: string
  endDate: string
}

export interface StoreStats {
  storeId: string
  storeName: string
  totalHours: number
  employeeCount: number
  averageHours: number
  completionRate: number
}

export interface EmployeeStats {
  employeeId: string
  employeeName: string
  position: string
  totalHours: number
  daysWorked: number
  averageDaily: number
  status: 'active' | 'delegated' | 'regular'
}

export interface StatusBreakdown {
  status: string
  count: number
  percentage: number
  hours: number
}

interface UseTimesheetStatsDataProps {
  filters: DashboardFilters
  userRole: string
  userStoreId?: string | null
  userZoneId?: string | null
  activeTab: 'stores' | 'employees' | 'status'
}

export function useTimesheetStatsData({
  filters,
  userRole,
  userStoreId,
  userZoneId,
  activeTab
}: UseTimesheetStatsDataProps) {
  return useQuery({
    queryKey: ['timesheet-stats', filters, userRole, activeTab],
    queryFn: async () => {
      // Base query with joins
      let query = supabase
        .from('timesheets')
        .select(`
          id,
          total_hours,
          employee_id,
          store_id,
          zone_id,
          period_start,
          period_end,
          created_at,
          daily_entries,
          employee:employees(
            id,
            full_name,
            position,
            employee_code
          ),
          store:stores(
            id,
            name
          )
        `)
        .gte('period_start', filters.startDate)
        .lte('period_end', filters.endDate)
        .order('created_at', { ascending: false })

      // Apply role-based filtering
      if (userRole === 'STORE_MANAGER' && userStoreId) {
        query = query.eq('store_id', userStoreId)
      } else if (userRole === 'ASM' && userZoneId) {
        query = query.eq('zone_id', userZoneId)
      }

      // Apply filter overrides
      if (filters.storeId) {
        query = query.eq('store_id', filters.storeId)
      }
      if (filters.zoneId) {
        query = query.eq('zone_id', filters.zoneId)
      }

      const { data: timesheets, error } = await query

      if (error) throw error

      // Process data based on active tab
      switch (activeTab) {
        case 'stores':
          return { stores: processStoreStats(timesheets || []) }
        case 'employees':
          return { employees: processEmployeeStats(timesheets || []) }
        case 'status':
          return { status: processStatusStats(timesheets || []) }
        default:
          return { stores: [], employees: [], status: [] }
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 3, // 3 minutes
    retry: 1
  })
}

// Process store statistics
function processStoreStats(timesheets: any[]): StoreStats[] {
  const storeMap = new Map<string, {
    storeName: string
    totalHours: number
    employees: Set<string>
    timesheetCount: number
  }>()

  timesheets.forEach(ts => {
    const storeId = ts.store_id
    const storeName = ts.store?.name || 'Unknown Store'
    
    if (!storeMap.has(storeId)) {
      storeMap.set(storeId, {
        storeName,
        totalHours: 0,
        employees: new Set(),
        timesheetCount: 0
      })
    }

    const store = storeMap.get(storeId)!
    store.totalHours += ts.total_hours
    store.employees.add(ts.employee_id)
    store.timesheetCount += 1
  })

  return Array.from(storeMap.entries()).map(([storeId, data]) => ({
    storeId,
    storeName: data.storeName,
    totalHours: data.totalHours,
    employeeCount: data.employees.size,
    averageHours: data.employees.size > 0 ? data.totalHours / data.employees.size : 0,
    completionRate: data.employees.size > 0 ? (data.timesheetCount / data.employees.size) * 100 : 0
  })).sort((a, b) => b.totalHours - a.totalHours)
}

// Process employee statistics
function processEmployeeStats(timesheets: any[]): EmployeeStats[] {
  const employeeMap = new Map<string, {
    employeeName: string
    position: string
    totalHours: number
    daysWorked: number
    isDelegated: boolean
  }>()

  timesheets.forEach(ts => {
    const employeeId = ts.employee_id
    const employeeName = ts.employee?.full_name || 'Unknown Employee'
    const position = ts.employee?.position || 'Staff'
    
    if (!employeeMap.has(employeeId)) {
      employeeMap.set(employeeId, {
        employeeName,
        position,
        totalHours: 0,
        daysWorked: 0,
        isDelegated: false // TODO: Check delegation status
      })
    }

    const employee = employeeMap.get(employeeId)!
    employee.totalHours += ts.total_hours
    
    // Count working days from daily_entries
    if (ts.daily_entries && typeof ts.daily_entries === 'object') {
      const workingDays = Object.values(ts.daily_entries).filter((entry: any) => 
        entry && typeof entry === 'object' && entry.hours > 0
      ).length
      employee.daysWorked += workingDays
    }
  })

  return Array.from(employeeMap.entries()).map(([employeeId, data]) => ({
    employeeId,
    employeeName: data.employeeName,
    position: data.position,
    totalHours: data.totalHours,
    daysWorked: data.daysWorked,
    averageDaily: data.daysWorked > 0 ? data.totalHours / data.daysWorked : 0,
    status: data.isDelegated ? 'delegated' : 'regular'
  })).sort((a, b) => b.totalHours - a.totalHours)
}

// Process status statistics
function processStatusStats(timesheets: any[]): StatusBreakdown[] {
  const statusMap = new Map<string, { count: number; hours: number }>()
  let totalCount = 0

  timesheets.forEach(ts => {
    totalCount += 1

    // Analyze daily entries for status breakdown
    if (ts.daily_entries && typeof ts.daily_entries === 'object') {
      Object.values(ts.daily_entries).forEach((entry: any) => {
        if (entry && typeof entry === 'object' && entry.status && entry.status !== 'alege') {
          const status = entry.status
          
          if (!statusMap.has(status)) {
            statusMap.set(status, { count: 0, hours: 0 })
          }
          
          const statusData = statusMap.get(status)!
          statusData.count += 1
          statusData.hours += entry.hours || 0
        }
      })
    }
  })

  return Array.from(statusMap.entries()).map(([statusCode, data]) => ({
    status: getStatusDisplayName(statusCode),
    count: data.count,
    percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
    hours: data.hours
  })).sort((a, b) => b.count - a.count)
}

// Helper function to get display name for status
function getStatusDisplayName(status: string): string {
  const statusNames: Record<string, string> = {
    'CO': 'Time Off',
    'CM': 'Medical Leave',
    'dispensa': 'Dispensation',
    'OFF': 'Day Off',
    'work': 'Working'
  }
  return statusNames[status] || status
}