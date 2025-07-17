// app/reports/page.tsx
'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { TimesheetDashboard } from '@/components/timesheets/TimesheetDashboard'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const permissions = usePermissions()
  const router = useRouter()
  const [activeView, setActiveView] = useState<'dashboard' | 'exports' | 'analytics'>('dashboard')

  const handleNavigateToGrid = () => {
    router.push('/timesheets')
  }

  const handleNavigateToList = () => {
    // Navigate to a future timesheet list view
    router.push('/timesheets')
  }

  // Check permissions
  if (!permissions.canViewTimesheets) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-red-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
                <p className="text-gray-600">You don't have permission to view reports.</p>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      {activeView === 'dashboard' && (
        <TimesheetDashboard
          onNavigateToGrid={handleNavigateToGrid}
          onNavigateToList={handleNavigateToList}
        />
      )}
      
      {/* Future: Add other report views */}
      {activeView === 'exports' && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Export Reports</h2>
            <p className="text-gray-600">Coming soon...</p>
          </div>
        </div>
      )}
      
      {activeView === 'analytics' && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics</h2>
            <p className="text-gray-600">Coming soon...</p>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}