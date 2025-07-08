'use client'

import { useState } from 'react'
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
  
  // Initialize with default current month timesheet
  const defaultPeriod = getDefaultPeriod()
  const [timesheetData, setTimesheetData] = useState<TimesheetGridData>({
    id: crypto.randomUUID(),
    startDate: defaultPeriod.startDate.toISOString(),
    endDate: defaultPeriod.endDate.toISOString(),
    entries: [], // Start empty - user can add employees
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const [isSaving, setIsSaving] = useState(false)

  // Handle saving timesheet
  const handleSave = async (data: TimesheetGridData) => {
    setIsSaving(true)
    try {
      console.log('Saving timesheet:', data)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setTimesheetData(data)
      toast.success('Timesheet saved successfully')
    } catch (error) {
      console.error('Failed to save timesheet:', error)
      toast.error('Failed to save timesheet')
      throw error
    } finally {
      setIsSaving(false)
    }
  }

  // Handle period or employee changes from controls
  const handleTimesheetUpdate = (newData: Partial<TimesheetGridData>) => {
    setTimesheetData(prev => ({
      ...prev,
      ...newData,
      updatedAt: new Date().toISOString()
    }))
  }

  // Check permissions
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
              <p className="text-gray-600">Manage employee time records</p>
            </div>

            {/* Controls Section */}
            <TimesheetControls
              timesheetData={timesheetData}
              onUpdate={handleTimesheetUpdate}
              isSaving={isSaving}
            />

            {/* Main Grid */}
            <TimesheetGrid
              startDate={new Date(timesheetData.startDate)}
              endDate={new Date(timesheetData.endDate)}
              employees={timesheetData.entries.map(entry => ({
                id: entry.employeeId,
                name: entry.employeeName,
                position: entry.position
              }))}
              existingData={timesheetData}
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