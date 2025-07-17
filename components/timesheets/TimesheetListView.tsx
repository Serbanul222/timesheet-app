// components/timesheets/TimesheetListView.tsx - Enhanced with editing
'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDate, formatHours } from '@/lib/utils'

interface TimesheetWithDetails {
  id: string
  employee_id: string
  store_id: string
  zone_id: string
  period_start: string
  period_end: string
  total_hours: number
  created_at: string
  updated_at: string
  employee?: {
    id: string
    full_name: string
    employee_code?: string
    position?: string
  }
  store?: {
    id: string
    name: string
  }
  zone?: {
    id: string
    name: string
  }
}

interface TimesheetListViewProps {
  storeId?: string
  storeName?: string
  employeeId?: string
  employeeName?: string
  onEditTimesheet: (timesheet: TimesheetWithDetails) => void
  onCreateNew: () => void
  className?: string
}

export function TimesheetListView({
  storeId,
  storeName,
  employeeId,
  employeeName,
  onEditTimesheet,
  onCreateNew,
  className = ''
}: TimesheetListViewProps) {
  const { profile } = useAuth()
  
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  })

  // Fetch timesheets with filters
  const { 
    data: timesheets = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['existing-timesheets', storeId, employeeId, filters, profile?.id],
    queryFn: async (): Promise<TimesheetWithDetails[]> => {
      if (!profile) return []

      let query = supabase
        .from('timesheets')
        .select(`
          id,
          employee_id,
          store_id,
          zone_id,
          period_start,
          period_end,
          total_hours,
          created_at,
          updated_at,
          employee:employees(
            id,
            full_name,
            employee_code,
            position
          ),
          store:stores(
            id,
            name
          ),
          zone:zones(
            id,
            name
          )
        `)
        .order('period_start', { ascending: false })

      // Apply role-based filtering
      if (profile.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id)
      } else if (profile.role === 'ASM' && profile.zone_id) {
        query = query.eq('zone_id', profile.zone_id)
      }

      // Apply specific filters from Reports dashboard
      if (storeId) {
        query = query.eq('store_id', storeId)
      }
      if (employeeId) {
        query = query.eq('employee_id', employeeId)
      }

      // Apply date filters
      if (filters.startDate) {
        query = query.gte('period_start', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('period_end', filters.endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to fetch timesheets:', error)
        throw error
      }

      // Apply search filter on client side
      let filteredData = data || []
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredData = filteredData.filter(ts => 
          ts.employee?.full_name?.toLowerCase().includes(searchLower) ||
          ts.store?.name?.toLowerCase().includes(searchLower) ||
          ts.employee?.employee_code?.toLowerCase().includes(searchLower)
        )
      }

      return filteredData
    },
    enabled: !!profile,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1
  })

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalHours = timesheets.reduce((sum, ts) => sum + ts.total_hours, 0)
    const uniqueEmployees = new Set(timesheets.map(ts => ts.employee_id)).size
    const dateRange = timesheets.length > 0 ? {
      start: timesheets[timesheets.length - 1]?.period_start,
      end: timesheets[0]?.period_start
    } : null

    return {
      totalTimesheets: timesheets.length,
      totalHours,
      uniqueEmployees,
      dateRange
    }
  }, [timesheets])

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Timesheets</h3>
          <p className="text-gray-600 mb-4">Failed to load existing timesheet data</p>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header with context */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {storeName ? `${storeName} Timesheets` : 
               employeeName ? `${employeeName} Timesheets` : 
               'Existing Timesheets'}
            </h2>
            <p className="text-gray-600 mt-1">
              {storeId ? `All timesheets for ${storeName}` :
               employeeId ? `All timesheets for ${employeeName}` :
               'Browse and edit existing timesheet records'}
            </p>
          </div>
          
          <Button onClick={onCreateNew}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New
          </Button>
        </div>

        {/* Summary Stats */}
        {timesheets.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-600 font-medium">Total Records</p>
              <p className="text-xl font-bold text-blue-900">{summaryStats.totalTimesheets}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-sm text-green-600 font-medium">Total Hours</p>
              <p className="text-xl font-bold text-green-900">{formatHours(summaryStats.totalHours)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-sm text-purple-600 font-medium">Employees</p>
              <p className="text-xl font-bold text-purple-900">{summaryStats.uniqueEmployees}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-sm text-orange-600 font-medium">Average</p>
              <p className="text-xl font-bold text-orange-900">
                {summaryStats.uniqueEmployees > 0 ? 
                  formatHours(summaryStats.totalHours / summaryStats.uniqueEmployees) : '0h'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Timesheets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search"
            placeholder="Search employees, stores..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
          
          <Input
            label="From Date"
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
          
          <Input
            label="To Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Timesheet List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Timesheet Records
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Click on any timesheet to edit it in the grid
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {timesheets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Timesheets Found</h4>
              <p className="text-gray-600 mb-4">
                {storeId || employeeId 
                  ? 'No existing timesheets found for the selected criteria'
                  : 'No timesheets have been created yet'
                }
              </p>
              <Button onClick={onCreateNew}>
                Create First Timesheet
              </Button>
            </div>
          ) : (
            timesheets.map((timesheet) => (
              <div key={timesheet.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                   onClick={() => onEditTimesheet(timesheet)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {timesheet.employee?.full_name || 'Unknown Employee'}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatDate(timesheet.period_start)} - {formatDate(timesheet.period_end)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {timesheet.store?.name || 'Unknown Store'}
                          </span>
                          {timesheet.employee?.employee_code && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              #{timesheet.employee.employee_code}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {formatHours(timesheet.total_hours)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {timesheet.employee?.position || 'Staff'}
                      </p>
                    </div>
                    
                    <div className="flex items-center text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}