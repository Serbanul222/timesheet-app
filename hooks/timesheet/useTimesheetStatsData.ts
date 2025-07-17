// hooks/timesheet/useTimesheetStatsData.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import {
  processStoreStats,
  processEmployeeStats,
  processStatusStats
} from '@/lib/services/timesheetStatsProcessor'

// Data shape interfaces
export interface StoreStats {
  storeId: string;
  storeName: string;
  totalHours: number;
  employeeCount: number;
  averageHours: number;
  completionRate: number;
}

export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  position: string;
  totalHours: number;
  daysWorked: number;
  averageDaily: number;
  status: 'active' | 'delegated' | 'regular';
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  hours: number;
}

interface DashboardFilters {
  period: 'week' | 'month' | 'quarter';
  storeId?: string;
  zoneId?: string;
  startDate: string;
  endDate: string;
}

interface UseTimesheetStatsDataProps {
  filters: DashboardFilters;
  userRole: string;
  userStoreId?: string | null;
  userZoneId?: string | null;
  activeTab: 'stores' | 'employees' | 'status';
}

/**
 * Custom hook to fetch and process timesheet statistics.
 */
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
      let query = supabase
        .from('timesheets')
        .select(`
          id, total_hours, store_id, zone_id, period_start, period_end,
          daily_entries, employee_count, store:stores(id, name)
        `)
        .gte('period_start', filters.startDate)
        .lte('period_end', filters.endDate);

      // Apply filters
      if (filters.storeId) query = query.eq('store_id', filters.storeId);
      else if (userRole === 'STORE_MANAGER' && userStoreId) query = query.eq('store_id', userStoreId);
      else if (filters.zoneId) query = query.eq('zone_id', filters.zoneId);
      else if (userRole === 'ASM' && userZoneId) query = query.eq('zone_id', userZoneId);

      const { data: timesheets, error } = await query;
      if (error) throw error;

      // Process data using the imported functions
      switch (activeTab) {
        case 'stores':
          return { stores: processStoreStats(timesheets || []) };
        case 'employees':
          return { employees: processEmployeeStats(timesheets || []) };
        case 'status':
          return { status: processStatusStats(timesheets || []) };
        default:
          return { stores: [], employees: [], status: [] };
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 3,
    retry: 1,
  });
}
