'use client'

import { useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Header } from '@/components/layout/Header'
import { TimesheetGrid } from '@/components/timesheets/TimesheetGrid'
import { TimesheetControls } from '@/components/timesheets/TimesheetControls'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { type TimesheetGridData } from '@/types/timesheet-grid'
import { getDefaultPeriod } from '@/lib/timesheet-utils'
import { toast } from 'sonner'

export default function TimesheetsPage() {
  const permissions = usePermissions()

  const defaultPeriod = getDefaultPeriod()
  const [timesheetData, setTimesheetData] = useState<TimesheetGridData>({
    id: crypto.randomUUID(),
    startDate: defaultPeriod.startDate.toISOString(),
    endDate: defaultPeriod.endDate.toISOString(),
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const [isSaving, setIsSaving] = useState(false)

  // ✅ FIX 1: `handleSave` no longer needs a `data` argument.
  // It now correctly uses the `timesheetData` from the component's state,
  // which is always the single source of truth.
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      console.log('Saving timesheet:', timesheetData)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      toast.success('Timesheet saved successfully')
    } catch (error) {
      console.error('Failed to save timesheet:', error)
      toast.error('Failed to save timesheet')
      throw error // Re-throw so the grid component can handle its state if needed
    } finally {
      setIsSaving(false)
    }
  }, [timesheetData]) // Dependency ensures the latest data is used in the save function

  // ✅ All state update functions are wrapped in useCallback to ensure stability
  const handleTimesheetUpdate = useCallback((newData: Partial<TimesheetGridData>) => {
    setTimesheetData(prev => ({
      ...prev,
      ...newData,
      updatedAt: new Date().toISOString()
    }))
  }, [])

  const handleGridDataChange = useCallback((newData: TimesheetGridData) => {
    setTimesheetData(newData)
  }, [])

  // Your permission check logic remains unchanged
  if (!permissions.canViewTimesheets) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="text-red-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
                <p className="text-gray-600">You don't have permission to view timesheets.</p>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  // The main component return logic remains unchanged
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
              <p className="text-gray-600">Manage employee time records</p>
            </div>

            <TimesheetControls
              timesheetData={timesheetData}
              onUpdate={handleTimesheetUpdate}
              isSaving={isSaving}
            />

            {/* ✅ FIX 2: The props passed to TimesheetGrid are now correct.
                It receives a single `data` prop and the necessary callbacks.
                All old props like `startDate`, `employees`, etc., are removed. */}
            <TimesheetGrid
              data={timesheetData}
              onDataChange={handleGridDataChange}
              onSave={handleSave}
              onCancel={() => toast.info('Changes discarded')}
              readOnly={!permissions.canEditTimesheets}
            />

          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}