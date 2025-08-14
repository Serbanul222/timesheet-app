// components/timesheets/visualization/StoreStatsPanel.tsx
'use client'

import { formatHours } from '@/lib/utils'
import { StoreStats } from '@/hooks/timesheets/useTimesheetStatsData'

interface StoreStatsPanelProps {
  stores: StoreStats[]
  isLoading: boolean
  onStoreClick?: (storeId: string, storeName: string) => void
  className?: string
}

export function StoreStatsPanel({ 
  stores, 
  isLoading, 
  onStoreClick,
  className = '' 
}: StoreStatsPanelProps) {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
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
    )
  }

  if (stores.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2 0H3" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există date pentru acest magazin</h3>
        <p className="text-gray-600">Nu există date disponibile pentru această perioadă</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {stores.map((store) => (
        <StoreStatsCard 
          key={store.storeId} 
          store={store} 
          onClick={() => onStoreClick?.(store.storeId, store.storeName)}
        />
      ))}
      
      {stores.length > 10 && (
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing top 10 stores by total hours • {stores.length} total stores
          </p>
        </div>
      )}
    </div>
  )
}

interface StoreStatsCardProps {
  store: StoreStats
  onClick?: () => void
}

function StoreStatsCard({ store, onClick }: StoreStatsCardProps) {
  const getCompletionRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-100'
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getHoursColor = (hours: number) => {
    if (hours >= 200) return 'text-blue-600'
    if (hours >= 100) return 'text-blue-500'
    return 'text-blue-400'
  }

  return (
    <div 
      className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg transition-colors ${
        onClick ? 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
      title={onClick ? `Click to view ${store.storeName} timesheet grid` : undefined}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2 0H3" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {store.storeName}
            </h4>
            <div className="flex items-center space-x-4 mt-1">
              <p className="text-xs text-gray-600">
                {store.employeeCount} employee{store.employeeCount !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center space-x-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCompletionRateColor(store.completionRate)}`}>
                  {store.completionRate.toFixed(1)}% completion
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <p className={`text-lg font-bold ${getHoursColor(store.totalHours)}`}>
          {formatHours(store.totalHours)}
        </p>
        <p className="text-xs text-gray-500">
          Avg {formatHours(store.averageHours)}/employee
        </p>
      </div>
    </div>
  )
}