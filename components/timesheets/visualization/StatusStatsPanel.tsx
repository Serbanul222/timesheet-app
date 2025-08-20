// components/timesheets/visualization/StatusStatsPanel.tsx
'use client'

import { formatHours } from '@/lib/utils'
import { StatusBreakdown } from '@/hooks/timesheet/useTimesheetStatsData'

interface StatusStatsPanelProps {
  statusData: StatusBreakdown[]
  isLoading: boolean
  className?: string
}

// Romanian translations for status names
const getStatusTranslation = (status: string): string => {
  const translations: Record<string, string> = {
    'Working': 'Ore lucrate',
    'Time Off': 'Concediu',
    'Medical Leave': 'Concediu medical',
    'Dispensation': 'Dispensă',
    'Day Off': 'Zi liberă',
    'ZL' : 'Zi liberă',
    'CFP': 'Concediu fără plată'
  }
  return translations[status] || status
}

export function StatusStatsPanel({ 
  statusData, 
  isLoading, 
  className = '' 
}: StatusStatsPanelProps) {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (statusData.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există date pentru status</h3>
        <p className="text-gray-600">Nu sunt disponibile date pentru analiza statusului pentru această perioadă</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {statusData.map((status) => (
        <StatusStatsCard key={status.status} status={status} />
      ))}
      
      {statusData.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Prezentare generală a statusului</h4>
          <p className="text-xs text-gray-600">
           Această defalcare arată distribuția diferitelor stări de lucru pentru toate pontajele înregistrate în perioada selectată. 
           Fiecare status reprezintă un tipar de alocare a timpului.
          </p>
        </div>
      )}
    </div>
  )
}

interface StatusStatsCardProps {
  status: StatusBreakdown
}

function StatusStatsCard({ status }: StatusStatsCardProps) {
  const getStatusColor = (statusName: string) => {
    const colors: Record<string, string> = {
      'Working': 'bg-green-500',
      'Time Off': 'bg-red-500',
      'Medical Leave': 'bg-yellow-500',
      'Dispensation': 'bg-purple-500',
      'Day Off': 'bg-gray-500'
    }
    return colors[statusName] || 'bg-blue-500'
  }

  const getStatusIcon = (statusName: string) => {
    switch (statusName) {
      case 'Working':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'Time Off':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        )
      case 'Medical Leave':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      case 'Dispensation':
        return (
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        {/* Status Icon */}
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          {getStatusIcon(status.status)}
        </div>
        
        {/* Status Info */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900">
            {getStatusTranslation(status.status)}
          </h4>
          <div className="flex items-center space-x-3 mt-1">
            {/* Progress Bar */}
            <div className="flex-1 max-w-32">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getStatusColor(status.status)}`}
                  style={{ width: `${Math.min(status.percentage, 100)}%` }}
                ></div>
              </div>
            </div>
            <span className="text-xs text-gray-500 w-12 text-right">
              {status.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="text-right">
        <p className="text-lg font-bold text-purple-600">
          {status.count}
        </p>
        <p className="text-xs text-gray-500">
          {formatHours(status.hours)} total
        </p>
      </div>
    </div>
  )
}