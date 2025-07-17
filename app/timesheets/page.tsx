// app/timesheets/page.tsx - Updated to show existing timesheets first
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Header } from '@/components/layout/Header'
import { TimesheetGrid } from '@/components/timesheets/TimesheetGrid'
import { TimesheetControls } from '@/components/timesheets/TimesheetControls'
import { TimesheetListView } from '@/components/timesheets/TimesheetListView'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { type TimesheetGridData } from '@/types/timesheet-grid'
import { getDefaultPeriod } from '@/lib/timesheet-utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'

interface TimesheetWithDetails {
  id: string
  employee_id: string
  store_id: string
  zone_id: string
  period_start: string
  period_end: string
  total_hours: number
  created_at: string
  updated_at: string
  daily_entries?: any
  employee?: {
    id: string
    full_name: string
    employee_code?: string
    position?: string
  }
  store?: {
    id: string
    name: string
  }
}

type ViewMode = 'list' | 'create' | 'edit'

export default function TimesheetsPage() {
  const permissions = usePermissions()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get URL parameters for pre-filtering
  const urlStoreId = searchParams.get('storeId')
  const urlStoreName = searchParams.get('storeName')
  const urlEmployeeId = searchParams.get('employeeId')
  const urlEmployeeName = searchParams.get('employeeName')

  // Start with list view if coming from Reports, otherwise create view
  const [viewMode, setViewMode] = useState<ViewMode>(
    (urlStoreId || urlEmployeeId) ? 'list' : 'create'
  )
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetWithDetails | null>(null)

  const defaultPeriod = getDefaultPeriod()
  const [timesheetData, setTimesheetData] = useState<TimesheetGridData>({
    id: crypto.randomUUID(),
    startDate: defaultPeriod.startDate.toISOString(),
    endDate: defaultPeriod.endDate.toISOString(),
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storeId: urlStoreId || undefined
  })

  const [isSaving, setIsSaving] = useState(false)

  // Show notification if coming from Reports page
  useEffect(() => {
    if (urlStoreId && urlStoreName) {
      toast.info(`Viewing timesheets for: ${urlStoreName}`, {
        description: 'Click on any timesheet to edit, or create a new one.',
        duration: 5000
      })
    } else if (urlEmployeeId && urlEmployeeName) {
      toast.info(`Viewing timesheets for: ${urlEmployeeName}`, {
        description: 'Click on any timesheet to edit, or create a new one.',
        duration: 5000
      })
    }

    // Clear URL parameters after showing notification
    if (urlStoreId || urlEmployeeId) {
      const newUrl = '/timesheets'
      router.replace(newUrl, { scroll: false })
    }
  }, [urlStoreId, urlStoreName, urlEmployeeId, urlEmployeeName, router])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      console.log('Saving timesheet:', timesheetData)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      if (editingTimesheet) {
        toast.success('Timesheet updated successfully')
      } else {
        toast.success('Timesheet created successfully')
      }
      
      // Return to list view after saving
      setViewMode('list')
      setEditingTimesheet(null)
    } catch (error) {
      console.error('Failed to save timesheet:', error)
      toast.error('Failed to save timesheet')
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [timesheetData, editingTimesheet])

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

  // Handle editing existing timesheet
  const handleEditTimesheet = useCallback((timesheet: TimesheetWithDetails) => {
    console.log('Editing timesheet:', timesheet)
    
    // Convert existing timesheet to grid format
    const convertedData: TimesheetGridData = {
      id: timesheet.id,
      startDate: timesheet.period_start,
      endDate: timesheet.period_end,
      storeId: timesheet.store_id,
      zoneId: timesheet.zone_id,
      entries: [], // TODO: Convert daily_entries to grid format
      createdAt: timesheet.created_at,
      updatedAt: timesheet.updated_at
    }

    // If we have daily_entries, convert them to grid format
    if (timesheet.daily_entries && timesheet.employee) {
      convertedData.entries = [{
        employeeId: timesheet.employee_id,
        employeeName: timesheet.employee.full_name,
        position: timesheet.employee.position || 'Staff',
        days: convertDailyEntriesToDays(timesheet.daily_entries)
      }]
    }

    setTimesheetData(convertedData)
    setEditingTimesheet(timesheet)
    setViewMode('edit')
    
    toast.info(`Editing timesheet for ${timesheet.employee?.full_name}`, {
      description: `Period: ${new Date(timesheet.period_start).toLocaleDateString()} - ${new Date(timesheet.period_end).toLocaleDateString()}`
    })
  }, [])

  // Handle creating new timesheet
  const handleCreateNew = useCallback(() => {
    const defaultPeriod = getDefaultPeriod()
    setTimesheetData({
      id: crypto.randomUUID(),
      startDate: defaultPeriod.startDate.toISOString(),
      endDate: defaultPeriod.endDate.toISOString(),
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storeId: urlStoreId || undefined
    })
    setEditingTimesheet(null)
    setViewMode('create')
  }, [urlStoreId])

  // Handle cancel/back to list
  const handleCancel = useCallback(() => {
    setViewMode('list')
    setEditingTimesheet(null)
    toast.info('Returned to timesheet list')
  }, [])

  // Convert daily_entries from database to grid day format
  const convertDailyEntriesToDays = (dailyEntries: any): Record<string, any> => {
    if (!dailyEntries || typeof dailyEntries !== 'object') return {}
    
    const days: Record<string, any> = {}
    
    Object.entries(dailyEntries).forEach(([dateKey, entry]: [string, any]) => {
      if (dateKey === '_metadata') return // Skip metadata
      
      if (entry && typeof entry === 'object') {
        days[dateKey] = {
          timeInterval: entry.timeInterval || '',
          startTime: '',
          endTime: '',
          hours: entry.hours || 0,
          status: entry.status || 'alege',
          notes: entry.notes || ''
        }
      }
    })
    
    return days
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
            
            {/* Page Header with Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {viewMode === 'list' ? 'Timesheets' : 
                   viewMode === 'edit' ? 'Edit Timesheet' : 'Create Timesheet'}
                </h1>
                <p className="text-gray-600">
                  {viewMode === 'list' ? 'View and manage timesheet records' :
                   viewMode === 'edit' ? 'Edit existing timesheet data' : 'Create new timesheet records'}
                </p>
                
                {/* Breadcrumb if coming from Reports */}
                {(urlStoreId || urlEmployeeId) && viewMode === 'list' && (
                  <div className="mt-2 flex items-center text-sm text-blue-600">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>From Reports Dashboard</span>
                    {urlStoreName && <span className="ml-2 font-medium">→ {urlStoreName}</span>}
                    {urlEmployeeName && <span className="ml-2 font-medium">→ {urlEmployeeName}</span>}
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              {viewMode !== 'list' && (
                <Button variant="outline" onClick={handleCancel}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to List
                </Button>
              )}
            </div>

            {/* Content based on view mode */}
            {viewMode === 'list' && (
              <TimesheetListView
                storeId={urlStoreId || undefined}
                storeName={urlStoreName || undefined}
                employeeId={urlEmployeeId || undefined}
                employeeName={urlEmployeeName || undefined}
                onEditTimesheet={handleEditTimesheet}
                onCreateNew={handleCreateNew}
              />
            )}

            {(viewMode === 'create' || viewMode === 'edit') && (
              <>
                <TimesheetControls
                  timesheetData={timesheetData}
                  onUpdate={handleTimesheetUpdate}
                  isSaving={isSaving}
                  preSelectedEmployeeId={urlEmployeeId || editingTimesheet?.employee_id}
                />

                <TimesheetGrid
                  data={timesheetData}
                  onDataChange={handleGridDataChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  readOnly={!permissions.canEditTimesheets}
                />
              </>
            )}

          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}