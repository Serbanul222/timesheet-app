// components/timesheets/visualization/TimesheetOverview.tsx
'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { formatHours } from '@/lib/utils'

interface DashboardFilters {
  period: 'week' | 'month' | 'quarter'
  storeId?: string
  zoneId?: string
  startDate: string
  endDate: string
}

interface OverviewStats {
  totalHours: number
  totalEmployees: number
  submittedTimesheets: number
  pendingTimesheets: number
  averageHoursPerEmployee: number
  comparisonPeriod: {
    totalHours: number
    totalEmployees: number
    changePercentage: number
  }
}

interface TimesheetOverviewProps {
  filters: DashboardFilters
  onNavigateToGrid?: () => void
  onNavigateToList?: () => void
  className?: string
}

export function TimesheetOverview({ 
  filters, 
  onNavigateToGrid, 
  onNavigateToList,
  className = '' 
}: TimesheetOverviewProps) {
  const { profile } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  // Fetch overview statistics
  const { 
    data: stats, 
    isLoading: isLoadingStats, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['timesheet-overview', filters, profile?.id],
    queryFn: async (): Promise<OverviewStats> => {
      if (!profile) throw new Error('Profile not available')

      // Build query based on user role and filters
      let query = supabase
        .from('timesheets')
        .select(`
          total_hours,
          employee_id,
          created_at,
          period_start,
          period_end,
          store_id,
          zone_id
        `)
        .gte('period_start', filters.startDate)
        .lte('period_end', filters.endDate)
        .order('created_at', { ascending: false })

      // Apply role-based filtering
      if (profile.role === 'STORE_MANAGER' && profile.store_id) {
        query = query.eq('store_id', profile.store_id)
      } else if (profile.role === 'ASM' && profile.zone_id) {
        query = query.eq('zone_id', profile.zone_id)
      }

      // Apply additional filters
      if (filters.storeId) {
        query = query.eq('store_id', filters.storeId)
      }
      if (filters.zoneId) {
        query = query.eq('zone_id', filters.zoneId)
      }

      const { data: timesheets, error } = await query

      if (error) throw error

      // Calculate current period stats
      const totalHours = timesheets?.reduce((sum, ts) => sum + ts.total_hours, 0) || 0
      const uniqueEmployees = new Set(timesheets?.map(ts => ts.employee_id) || [])
      const totalEmployees = uniqueEmployees.size
      const submittedTimesheets = timesheets?.length || 0
      const averageHoursPerEmployee = totalEmployees > 0 ? totalHours / totalEmployees : 0

      // Calculate comparison period (previous period of same length)
      const currentStart = new Date(filters.startDate)
      const currentEnd = new Date(filters.endDate)
      const periodLength = currentEnd.getTime() - currentStart.getTime()
      
      const previousStart = new Date(currentStart.getTime() - periodLength)
      const previousEnd = new Date(currentStart.getTime() - 1) // Day before current period

      // Fetch previous period data for comparison
      let previousQuery = supabase
        .from('timesheets')
        .select('total_hours, employee_id')
        .gte('period_start', previousStart.toISOString().split('T')[0])
        .lte('period_end', previousEnd.toISOString().split('T')[0])

      // Apply same role-based filtering for comparison
      if (profile.role === 'STORE_MANAGER' && profile.store_id) {
        previousQuery = previousQuery.eq('store_id', profile.store_id)
      } else if (profile.role === 'ASM' && profile.zone_id) {
        previousQuery = previousQuery.eq('zone_id', profile.zone_id)
      }

      if (filters.storeId) {
        previousQuery = previousQuery.eq('store_id', filters.storeId)
      }
      if (filters.zoneId) {
        previousQuery = previousQuery.eq('zone_id', filters.zoneId)
      }

      const { data: previousTimesheets } = await previousQuery

      const previousTotalHours = previousTimesheets?.reduce((sum, ts) => sum + ts.total_hours, 0) || 0
      const previousUniqueEmployees = new Set(previousTimesheets?.map(ts => ts.employee_id) || [])
      const previousTotalEmployees = previousUniqueEmployees.size

      const changePercentage = previousTotalHours > 0 
        ? ((totalHours - previousTotalHours) / previousTotalHours) * 100 
        : 0

      return {
        totalHours,
        totalEmployees,
        submittedTimesheets,
        pendingTimesheets: 0, // TODO: Implement pending status
        averageHoursPerEmployee,
        comparisonPeriod: {
          totalHours: previousTotalHours,
          totalEmployees: previousTotalEmployees,
          changePercentage
        }
      }
    },
    enabled: !!profile,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1
  })

  useEffect(() => {
    setIsLoading(isLoadingStats)
  }, [isLoadingStats])

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Overview</h3>
          <p className="text-gray-600 mb-4">Could not fetch timesheet overview data</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
        <div className="text-sm text-gray-500">
          {new Date(filters.startDate).toLocaleDateString()} - {new Date(filters.endDate).toLocaleDateString()}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-24"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            
            {/* Total Hours */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Hours</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatHours(stats?.totalHours || 0)}
                  </p>
                  {stats?.comparisonPeriod && (
                    <p className="text-xs text-blue-700 mt-1">
                      {stats.comparisonPeriod.changePercentage >= 0 ? '+' : ''}
                      {stats.comparisonPeriod.changePercentage.toFixed(1)}% from last period
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Employees */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Employees</p>
                  <p className="text-2xl font-bold text-green-900">
                    {stats?.totalEmployees || 0}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Avg {formatHours(stats?.averageHoursPerEmployee || 0)}/person
                  </p>
                </div>
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Submitted Timesheets */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Submissions</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {stats?.submittedTimesheets || 0}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Timesheet records
                  </p>
                </div>
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Completion</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {stats?.totalEmployees > 0 
                      ? Math.round((stats.submittedTimesheets / stats.totalEmployees) * 100)
                      : 0
                    }%
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    Submission rate
                  </p>
                </div>
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Quick Actions</h3>
                <p className="text-xs text-gray-600">Manage timesheets and view detailed reports</p>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onNavigateToList}
                >
                  View All Timesheets
                </Button>
                <Button 
                  size="sm"
                  onClick={onNavigateToGrid}
                >
                  Create New Grid
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}