// components/timesheets/visualization/EmployeeStatsPanel.tsx
'use client'

import { formatHours } from '@/lib/utils'
import { EmployeeStats } from '@/hooks/timesheet/useTimesheetStatsData'
interface EmployeeStatsPanelProps {
  employees: EmployeeStats[]
  isLoading: boolean
  onEmployeeClick?: (employeeId: string, employeeName: string) => void
  className?: string
}

export function EmployeeStatsPanel({ 
  employees, 
  isLoading, 
  onEmployeeClick,
  className = '' 
}: EmployeeStatsPanelProps) {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (employees.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nu există date pentru angajați</h3>
        <p className="text-gray-600">Nu sunt disponibile date pentru angajați pentru această perioadă</p>
      </div>
    )
  }

  // Show top 10 employees
  const topEmployees = employees.slice(0, 10)

  return (
    <div className={`space-y-3 ${className}`}>
      {topEmployees.map((employee, index) => (
        <EmployeeStatsCard 
          key={employee.employeeId} 
          employee={employee} 
          rank={index + 1}
          onClick={() => onEmployeeClick?.(employee.employeeId, employee.employeeName)}
        />
      ))}
      
      {employees.length > 10 && (
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
         Vizualizare primii 10 angajați • {employees.length} total angajați
          </p>
        </div>
      )}
    </div>
  )
}

interface EmployeeStatsCardProps {
  employee: EmployeeStats
  rank: number
  onClick?: () => void
}

function EmployeeStatsCard({ employee, rank, onClick }: EmployeeStatsCardProps) {
  const getHoursColor = (hours: number) => {
    if (hours >= 160) return 'text-green-600'
    if (hours >= 120) return 'text-green-500'
    if (hours >= 80) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delegated':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div 
      className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg transition-colors ${
        onClick ? 'hover:bg-green-50 hover:border-green-300 cursor-pointer' : 'hover:bg-gray-50'
      }`}
      onClick={onClick}
      title={onClick ? `Click to view ${employee.employeeName}'s timesheet` : undefined}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Rank Badge */}
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${getRankBadgeColor(rank)}`}>
          {rank}
        </div>

        {/* Employee Avatar */}
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-600">
            {getInitials(employee.employeeName)}
          </span>
        </div>
        
        {/* Employee Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {employee.employeeName}
            </h4>
            {employee.status === 'delegated' && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(employee.status)}`}>
                Delegat
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4 mt-1">
            <p className="text-xs text-gray-600 truncate">
              {employee.position}
            </p>
            <p className="text-xs text-gray-500">
              {employee.daysWorked} zile lucrate
            </p>
          </div>
        </div>
      </div>
      
      {/* Hours Statistics */}
      <div className="text-right">
        <p className={`text-lg font-bold ${getHoursColor(employee.totalHours)}`}>
          {formatHours(employee.totalHours)}
        </p>
        <p className="text-xs text-gray-500">
          Avg {formatHours(employee.averageDaily)}/zi
        </p>
      </div>
    </div>
  )
}