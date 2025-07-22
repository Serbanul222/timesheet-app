// components/timesheets/TimesheetDashboard.tsx - FIXED: Strict TypeScript compliance
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { TimesheetOverview } from './visualization/TimesheetOverview'
import { TimesheetStats } from './visualization/TimesheetStats'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface DashboardFilters {
  period: 'week' | 'month' | 'quarter'
  storeId?: string
  zoneId?: string
  startDate: string
  endDate: string
}

interface DashboardProps {
  className?: string
  onNavigateToGrid?: () => void
  onNavigateToList?: () => void
}

export function TimesheetDashboard({ 
  className = '', 
  onNavigateToGrid, 
  onNavigateToList 
}: DashboardProps) {
  const { user, profile } = useAuth()
  const permissions = usePermissions()
  const router = useRouter()
  
  // Helper function to format date to YYYY-MM-DD with null safety
  const formatDateString = (date: Date): string => {
    const isoString = date.toISOString()
    const datePart = isoString.split('T')[0]
    return datePart || '' // Fallback to empty string if split fails
  }
  
  // Default to current month with proper type handling
  const defaultFilters: DashboardFilters = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const baseFilters: DashboardFilters = {
      period: 'month',
      startDate: formatDateString(startOfMonth),
      endDate: formatDateString(endOfMonth)
    }

    // Conditionally add optional properties only if they have values
    if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
      baseFilters.storeId = profile.store_id
    }
    
    if (profile?.role === 'ASM' && profile.zone_id) {
      baseFilters.zoneId = profile.zone_id
    }
    
    return baseFilters
  }, [profile])

  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Handle period change with proper date string handling
  const handlePeriodChange = (period: DashboardFilters['period']) => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'week':
        const dayOfWeek = now.getDay()
        startDate = new Date(now)
        startDate.setDate(now.getDate() - dayOfWeek)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        break
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStart, 1)
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0)
        break
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // Extract date strings explicitly for type safety
    const startDateString = formatDateString(startDate)
    const endDateString = formatDateString(endDate)

    setFilters(prev => ({
      ...prev,
      period,
      startDate: startDateString,
      endDate: endDateString
    }))
  }

  // Handle manual date change
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      period: 'month' as const // Reset to month when manual dates are used
    }))
  }

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Simulate refresh - replace with actual data refresh logic
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Failed to refresh dashboard:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Quick navigation actions (remove unused function warnings)
  const handleCreateNew = () => {
    console.log('Navigate to create new timesheet')
    if (onNavigateToGrid) {
      onNavigateToGrid()
    }
  }

  const handleViewAll = () => {
    console.log('Navigate to timesheet list')
    if (onNavigateToList) {
      onNavigateToList()
    }
  }

  // Handle clicks from detailed statistics
  const handleStoreClick = (storeId: string, storeName: string) => {
    console.log('Navigate to timesheet grid for store:', storeName, storeId)
    router.push(`/timesheets?storeId=${storeId}&storeName=${encodeURIComponent(storeName)}`)
  }

  const handleEmployeeClick = (employeeId: string, employeeName: string) => {
    console.log('Navigate to timesheet grid for employee:', employeeName, employeeId)
    router.push(`/timesheets?employeeId=${employeeId}&employeeName=${encodeURIComponent(employeeName)}`)
  }

  // Loading state
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Permission check
  if (!permissions.canViewTimesheets) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600">You don't have permission to view the timesheet dashboard.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Timesheet Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Overview of timesheet activity and performance metrics
            </p>
          </div>
          
          <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              loading={isRefreshing}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              }
            >
              Refresh
            </Button>
            
            {permissions.canCreateTimesheets && (
              <Button
                onClick={handleCreateNew}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 4v16m8-8H4" 
                    />
                  </svg>
                }
              >
                Create New
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Time Period</h3>
            <div className="flex space-x-2">
              {(['week', 'month', 'quarter'] as const).map((period) => (
                <Button
                  key={period}
                  variant={filters.period === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodChange(period)}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Input
              label="From"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              containerClassName="w-auto"
            />
            <Input
              label="To"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              containerClassName="w-auto"
            />
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <TimesheetOverview 
        filters={filters}
        userRole={profile.role}
        userStoreId={profile.store_id || undefined}
        userZoneId={profile.zone_id || undefined}
      />

      {/* Detailed Statistics */}
      <TimesheetStats 
        filters={filters}
        userRole={profile.role}
        userStoreId={profile.store_id || undefined}
        userZoneId={profile.zone_id || undefined}
        onStoreClick={handleStoreClick}
        onEmployeeClick={handleEmployeeClick}
      />

    </div>
  )
}