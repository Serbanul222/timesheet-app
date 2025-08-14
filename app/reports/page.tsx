// app/reports/page.tsx - COMPLETELY FIXED: Remove all duplicate headers
'use client'

import { useState } from 'react'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { TimesheetDashboard } from '@/components/timesheets/TimesheetDashboard'
import { useRouter } from 'next/navigation'
import ExportPanel from '@/components/reports/ExportPanel'
import { useTimesheetExport } from '@/hooks/useTimesheetExport'
import { Button } from '@/components/ui/Button'
import { Download, BarChart3, FileText } from 'lucide-react'
import type { ExportFormat, ExportOptions } from '@/types/exports'
import { MainLayout } from '@/components/layout/MainLayout'

export default function ReportsPage() {
  const permissions = usePermissions()
  const router = useRouter()
  const [activeView, setActiveView] = useState<'dashboard' | 'exports'>('dashboard')

  const { exportState, exportTimesheets } = useTimesheetExport()

  const handleNavigateToGrid = () => {
    router.push('/timesheets')
  }

  const handleNavigateToList = () => {
    router.push('/timesheets')
  }

  // Handle export with proper data fetching
  const handleExport = async (format: ExportFormat, options: ExportOptions) => {
    try {
      console.log('Exporting timesheets:', { format, options })
      
      // Validate required options
      if (!options.dateRange?.startDate || !options.dateRange?.endDate) {
        throw new Error('Date range is required for export')
      }
      
      // Create properly typed options with defaults for all required fields
      const validatedOptions = {
        // Required dateRange
        dateRange: {
          startDate: options.dateRange.startDate,
          endDate: options.dateRange.endDate
        },
        // Optional fields with defaults
        storeIds: options.storeIds,
        zoneIds: options.zoneIds,
        employeeIds: options.employeeIds,
        includeDelegated: options.includeDelegated ?? false,
        includeNotes: options.includeNotes ?? false,
        includeEmptyDays: options.includeEmptyDays ?? false,
        groupByStore: options.groupByStore ?? false,
        groupByEmployee: options.groupByEmployee ?? false,
        maxRows: options.maxRows,
        sheetNames: options.sheetNames,
        filename: options.filename ?? 'export.xlsx',
        compression: options.compression ?? false
      }
      
      // Call with validated options that match the expected type
      await exportTimesheets(format, validatedOptions)
      
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Check permissions
  if (!permissions.canViewTimesheets) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Acces Restricționat</h2>
              <p className="text-gray-600">Nu ai permisiunea de a vizualiza rapoartele.</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Raportare</h1>
                <p className="text-gray-600 mt-1">
                  Vizualizează și exportă datele pontajelor angajaților
                </p>
              </div>
              
              <div className="mt-4 lg:mt-0 flex space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('dashboard')}
                  leftIcon={<BarChart3 className="h-4 w-4" />}
                >
                  Dashboard
                </Button>
                <Button
                  variant={activeView === 'exports' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('exports')}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Exportă Datele
                </Button>
              </div>
            </div>
          </div>

          {activeView === 'dashboard' && (
            <TimesheetDashboard
              onNavigateToGrid={handleNavigateToGrid}
              onNavigateToList={handleNavigateToList}
            />
          )}
          
          {activeView === 'exports' && (
            <div className="space-y-6">
              <ExportPanel
                userRole={permissions.canViewTimesheets ? 'HR' : 'STORE_MANAGER'}
                onExport={handleExport}
              />
              
              {exportState.isLoading && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Exportare...</h3>
                      <p className="text-sm text-gray-600">Se procesează datele pontajelor</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${exportState.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{exportState.progress || 0}%</span>
                    </div>
                  </div>
                </div>
              )}
              
              {exportState.lastExport && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Exporturi recente</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          exportState.lastExport.success ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {exportState.lastExport.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(exportState.lastExport.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {exportState.lastExport.success ? (
                          <span className="text-xs text-green-600 font-medium">
                            ✓ Success
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">
                            ✗ Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          

        </div>
      </div>
    </MainLayout>
  )
}