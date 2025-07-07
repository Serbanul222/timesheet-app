'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { Database } from '@/types/database'
import { toast } from 'sonner'

type Timesheet = Database['public']['Tables']['timesheets']['Row']
type TimesheetInsert = Database['public']['Tables']['timesheets']['Insert']
type TimesheetUpdate = Database['public']['Tables']['timesheets']['Update']

// Extended timesheet type with related data
export interface TimesheetWithDetails extends Timesheet {
  employee?: {
    id: string
    full_name: string
    employee_code: string | null
  }
  store?: {
    id: string
    name: string
  }
  zone?: {
    id: string
    name: string
  }
  created_by_user?: {
    id: string
    full_name: string
  }
}

interface TimesheetFilters {
  employeeId?: string
  storeId?: string
  zoneId?: string
  startDate?: string
  endDate?: string
  search?: string
}

export function useTimesheets(filters: TimesheetFilters = {}) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()

  // Query to fetch timesheets with filtering and permissions
  const {
    data: timesheets = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['timesheets', filters, profile?.role, profile?.zone_id, profile?.store_id],
    queryFn: async (): Promise<TimesheetWithDetails[]> => {
      console.log('useTimesheets: Fetching timesheets with filters:', filters)
      
      // Query without the problematic foreign key reference
      let query = supabase
        .from('timesheets')
        .select(`
          *,
          employee:employees(id, full_name, employee_code),
          store:stores(id, name),
          zone:zones(id, name)
        `)
        .order('created_at', { ascending: false })

      // Apply role-based filtering
      if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id)
      } else if (profile?.role === 'ASM' && profile.zone_id) {
        query = query.eq('zone_id', profile.zone_id)
      }

      // Apply user filters
      if (filters.employeeId) {
        query = query.eq('employee_id', filters.employeeId)
      }
      if (filters.storeId) {
        query = query.eq('store_id', filters.storeId)
      }
      if (filters.zoneId) {
        query = query.eq('zone_id', filters.zoneId)
      }
      if (filters.startDate) {
        query = query.gte('period_start', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('period_end', filters.endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('useTimesheets: Fetch error:', error)
        throw error
      }

      console.log('useTimesheets: Fetched', data?.length || 0, 'timesheets')
      return data || []
    },
    enabled: !!user && !!profile && permissions.canViewTimesheets,
    staleTime: 1000 * 60 * 5,
    retry: 1
  })

  // Mutation to create a new timesheet
  const createTimesheetMutation = useMutation({
    mutationFn: async (newTimesheet: TimesheetInsert): Promise<Timesheet> => {
      console.log('useTimesheets: Creating timesheet with data:', newTimesheet)
      
      // Validate required fields
      if (!newTimesheet.employee_name && !newTimesheet.employee_id) {
        throw new Error('Employee name or ID is required')
      }
      if (!newTimesheet.store_id) {
        throw new Error('Store ID is required')
      }
      if (!newTimesheet.zone_id) {
        throw new Error('Zone ID is required')
      }

      try {
        const insertData = {
          ...newTimesheet,
          created_by: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        console.log('useTimesheets: Inserting data:', insertData)

        const { data, error } = await supabase
          .from('timesheets')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          console.error('useTimesheets: Supabase create error:', error)
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          
          // Provide user-friendly error messages
          if (error.code === '23502') {
            throw new Error(`Missing required field: ${error.message}`)
          } else if (error.code === '23503') {
            throw new Error('Invalid store or zone selected')
          } else if (error.code === '42703') {
            throw new Error('Database column not found. Please contact administrator.')
          } else {
            throw new Error(`Database error: ${error.message}`)
          }
        }

        console.log('useTimesheets: Successfully created timesheet:', data)
        return data

      } catch (err: any) {
        console.error('useTimesheets: Unexpected error during creation:', err)
        
        if (err.message) {
          throw err // Re-throw custom errors with user-friendly messages
        } else {
          throw new Error('An unexpected error occurred while creating the timesheet')
        }
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] })
      toast.success('Timesheet created successfully')
      console.log('useTimesheets: Created timesheet:', data.id)
    },
    onError: (error: any) => {
      console.error('useTimesheets: Create mutation failed:', error)
      const errorMessage = error?.message || 'Failed to create timesheet'
      toast.error(errorMessage)
    }
  })

  // Mutation to update a timesheet
  const updateTimesheetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TimesheetUpdate }): Promise<Timesheet> => {
      console.log('useTimesheets: Updating timesheet:', id, updates)
      
      const { data, error } = await supabase
        .from('timesheets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('useTimesheets: Update error:', error)
        throw error
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] })
      toast.success('Timesheet updated successfully')
      console.log('useTimesheets: Updated timesheet:', data.id)
    },
    onError: (error: any) => {
      console.error('useTimesheets: Update failed:', error)
      toast.error('Failed to update timesheet')
    }
  })

  // Mutation to delete a timesheet
  const deleteTimesheetMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('useTimesheets: Deleting timesheet:', id)
      
      const { error } = await supabase
        .from('timesheets')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('useTimesheets: Delete error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] })
      toast.success('Timesheet deleted successfully')
      console.log('useTimesheets: Deleted timesheet')
    },
    onError: (error: any) => {
      console.error('useTimesheets: Delete failed:', error)
      toast.error('Failed to delete timesheet')
    }
  })

  return {
    // Data
    timesheets,
    isLoading,
    error,
    
    // Actions
    refetch,
    createTimesheet: createTimesheetMutation.mutate,
    updateTimesheet: updateTimesheetMutation.mutate,
    deleteTimesheet: deleteTimesheetMutation.mutate,
    
    // Loading states
    isCreating: createTimesheetMutation.isPending,
    isUpdating: updateTimesheetMutation.isPending,
    isDeleting: deleteTimesheetMutation.isPending,
    
    // Permissions
    canCreate: permissions.canCreateTimesheets,
    canEdit: permissions.canEditTimesheets,
    canDelete: permissions.canDeleteTimesheets,
    canExport: permissions.canExportTimesheets
  }
}