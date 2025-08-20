// components/timesheets/TimesheetDashboard.tsx - Using reusable EuropeanDateInput component
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { TimesheetOverview } from './visualization/TimesheetOverview'
import { TimesheetStats } from './visualization/TimesheetStats'
import { Button } from '@/components/ui/Button'
import { EuropeanDateInput } from '@/components/ui/EuropeanDateInput'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'

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
  
  // Period labels mapping
  const periodLabels: Record<DashboardFilters['period'], string> = {
    week: 'Săptămână',
    month: 'Lună',
    quarter: 'Trimestru'
  }
  
  // Helper function to format date to YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const isoString = date.toISOString()
    const datePart = isoString.split('T')[0]
    return datePart || ''
  }
  
  // Default to current month
  const defaultFilters: DashboardFilters = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const baseFilters: DashboardFilters = {
      period: 'month',
      startDate: formatDateString(startOfMonth),
      endDate: formatDateString(endOfMonth)
    }

    // Add role-based filters
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

  // Handle period change
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

    setFilters(prev => ({
      ...prev,
      period,
      startDate: formatDateString(startDate),
      endDate: formatDateString(endDate)
    }))
  }

  // Handle date change from EuropeanDateInput
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
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Failed to refresh dashboard:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Navigation actions
  const handleCreateNew = () => {
    if (onNavigateToGrid) {
      onNavigateToGrid()
    }
  }

  // Handle clicks from detailed statistics
  const handleStoreClick = (storeId: string, storeName: string) => {
    router.push(`/timesheets?storeId=${storeId}&storeName=${encodeURIComponent(storeName)}`)
  }

  const handleEmployeeClick = (employeeId: string, employeeName: string) => {
    router.push(`/timesheets?employeeId=${employeeId}&employeeName=${encodeURIComponent(employeeName)}`)
  }

  // Get period display in European format
  const getPeriodDisplayText = (): string => {
    if (filters.startDate && filters.endDate) {
      const startDisplay = formatDateEuropean(filters.startDate)
      const endDisplay = formatDateEuropean(filters.endDate)
      return `${startDisplay} - ${endDisplay}`
    }
    return periodLabels[filters.period]
  }

  // Loading state
  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Încărcare panou...</p>
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acces restriționat</h2>
        <p className="text-gray-600">Nu ai permisiunea de a vizualiza panoul de control al pontajelor.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Dashboard Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panou de control pontaje</h1>
            <p className="text-gray-600 mt-1">
              Monitorizare și gestionare pontaje pentru perioada: <span className="font-medium">{getPeriodDisplayText()}</span>
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
              Reîmprospătează
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
                Crează un nou pontaj
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Perioada de timp</h3>
            <div className="flex space-x-2">
              {(['week', 'month', 'quarter'] as const).map((period) => (
                <Button
                  key={period}
                  variant={filters.period === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodChange(period)}
                >
                  {periodLabels[period]}
                </Button>
              ))}
            </div>
          </div>
          
          {/* European Date Inputs */}
          <div className="flex space-x-4">
            <EuropeanDateInput
              label="De la"
              value={filters.startDate}
              onChange={(date) => handleDateChange('startDate', date)}
              disabled={isRefreshing}
              required
            />
            <EuropeanDateInput
              label="Până la"
              value={filters.endDate}
              onChange={(date) => handleDateChange('endDate', date)}
              disabled={isRefreshing}
              required
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