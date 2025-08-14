// components/timesheets/visualization/TimesheetStats.tsx
'use client'

import { useState } from 'react'
import { StoreStatsPanel } from './StoreStatsPanel'
import { EmployeeStatsPanel } from './EmployeeStatsPanel'
import { StatusStatsPanel } from './StatusStatsPanel'
import { useTimesheetStatsData } from '@/hooks/timesheet/useTimesheetStatsData'
import { Button } from '@/components/ui/Button'

interface DashboardFilters {
  period: 'week' | 'month' | 'quarter'
  storeId?: string
  zoneId?: string
  startDate: string
  endDate: string
}

interface TimesheetStatsProps {
  filters: DashboardFilters
  userRole: string
  userStoreId?: string | null
  userZoneId?: string | null
  onStoreClick?: (storeId: string, storeName: string) => void
  onEmployeeClick?: (employeeId: string, employeeName: string) => void
  className?: string
}

export function TimesheetStats({ 
  filters, 
  userRole, 
  userStoreId, 
  userZoneId,
  onStoreClick,
  onEmployeeClick,
  className = '' 
}: TimesheetStatsProps) {
  const [activeTab, setActiveTab] = useState<'stores' | 'employees' | 'status'>('stores')

  // Tab labels mapping - like a HashMap in Java
  const tabLabels: Record<'stores' | 'employees' | 'status', string> = {
    stores: 'Magazine',
    employees: 'Angajați',
    status: 'Status'
  }

  // Fetch data using custom hook
  const { 
    data: statsData, 
    isLoading, 
    error,
    refetch 
  } = useTimesheetStatsData({
    filters,
    userRole,
    userStoreId,
    userZoneId,
    activeTab
  })

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Statisticile nu s-au putut încărca cu succes</h3>
          <p className="text-gray-600 mb-4">Nu s-au putut obține statisticile detaliate ale pontajelor</p>
          <Button variant="outline" onClick={() => refetch()}>
            Încearcă din nou
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Statistici detaliate</h2>
        
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['stores', 'employees', 'status'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Panels */}
      {!isLoading && (
        <>
          {activeTab === 'stores' && (
            <StoreStatsPanel 
              stores={statsData?.stores || []}
              isLoading={isLoading}
              onStoreClick={onStoreClick}
            />
          )}

          {activeTab === 'employees' && (
            <EmployeeStatsPanel 
              employees={statsData?.employees || []}
              isLoading={isLoading}
              onEmployeeClick={onEmployeeClick}
            />
          )}

          {activeTab === 'status' && (
            <StatusStatsPanel 
              statusData={statsData?.status || []}
              isLoading={isLoading}
            />
          )}
        </>
      )}
    </div>
  )
}