'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { Database, DailyEntry } from '@/types/database'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, format } from 'date-fns'

type Timesheet = Database['public']['Tables']['timesheets']['Row']
type TimesheetInsert = Database['public']['Tables']['timesheets']['Insert']
type TimesheetUpdate = Database['public']['Tables']['timesheets']['Update']

export interface TimesheetWithDetails extends Timesheet {
  employee?: {
    id: string
    full_name: string
    employee_code: string | null
  }
  store?: { id: string; name: string }
  zone?: { id: string; name: string }
}

interface TimesheetFilters {
  month?: Date;
}

const fullTimesheetSelect = `
  *,
  employee:employees(id, full_name, employee_code),
  store:stores(id, name),
  zone:zones(id, name)
`

export function useTimesheets(filters: TimesheetFilters = {}) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()

  const queryKey = ['timesheets', filters.month ? format(filters.month, 'yyyy-MM') : 'all', profile?.id]

  const {
    data: timesheets = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<TimesheetWithDetails[]> => {
      let query = supabase.from('timesheets').select(fullTimesheetSelect)

      // Filter by month if provided
      if (filters.month) {
        const firstDay = format(startOfMonth(filters.month), 'yyyy-MM-dd')
        const lastDay = format(endOfMonth(filters.month), 'yyyy-MM-dd')
        query = query.gte('period_start', firstDay).lte('period_start', lastDay)
      }

      // Apply role-based filtering
      if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id)
      } else if (profile?.role === 'ASM' && profile.zone_id) {
        query = query.eq('zone_id', profile.zone_id)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user && !!profile && permissions.canViewTimesheets,
  })

  // Correctly calculate total hours from daily entries
  const calculateTotalHours = (entries: DailyEntry[] | null | undefined): number => {
      if (!entries) return 0;
      return entries.reduce((acc, entry) => {
          if (entry.status === 'work' && entry.hours) {
              const parts = entry.hours.split('-').map(p => parseInt(p, 10));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  return acc + (parts[1] - parts[0]);
              }
          }
          return acc;
      }, 0);
  };
  
  const createOrUpdateMutation = useMutation({
    mutationFn: async (payload: { timesheet?: TimesheetWithDetails, employeeId: string, month: Date, daily_entries: DailyEntry[] }) => {
      const { timesheet, employeeId, month, daily_entries } = payload;
      const employee = (await supabase.from('employees').select('*').eq('id', employeeId).single()).data;
      if (!employee) throw new Error("Employee not found");

      const total_hours = calculateTotalHours(daily_entries);

      const dataToUpsert = {
        employee_id: employee.id,
        store_id: employee.store_id,
        zone_id: employee.zone_id,
        period_start: format(startOfMonth(month), 'yyyy-MM-dd'),
        period_end: format(endOfMonth(month), 'yyyy-MM-dd'),
        created_by: user!.id,
        daily_entries,
        total_hours,
      };

      if (timesheet) { // This is an update
        const { data, error } = await supabase
          .from('timesheets')
          .update({ ...dataToUpsert, updated_at: new Date().toISOString() })
          .eq('id', timesheet.id)
          .select(fullTimesheetSelect)
          .single();
        if (error) throw error;
        return { data, isUpdate: true };
      } else { // This is a create
        const { data, error } = await supabase
          .from('timesheets')
          .insert(dataToUpsert)
          .select(fullTimesheetSelect)
          .single();
        if (error) throw error;
        return { data, isUpdate: false };
      }
    },
    onSuccess: ({ isUpdate }) => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success(`Timesheet ${isUpdate ? 'updated' : 'created'} successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save timesheet');
    },
  });

  // Add delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (timesheetId: string) => {
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', timesheetId);
      
      if (error) throw error;
      return timesheetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      toast.success('Timesheet deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete timesheet');
    },
  });

  return {
    timesheets,
    isLoading,
    error,
    upsertTimesheet: createOrUpdateMutation.mutate,
    isUpserting: createOrUpdateMutation.isPending,
    deleteTimesheet: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    canCreate: permissions.canCreateTimesheets,
    canEdit: permissions.canEditTimesheets,
    canDelete: permissions.canDeleteTimesheets, // Add this if it exists in permissions
  }
}