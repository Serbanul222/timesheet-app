'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Header } from '@/components/layout/Header'
import { TimesheetTable } from '@/components/timesheets/TimesheetTable'
import { TimesheetForm } from '@/components/timesheets/TimesheetForm'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { type TimesheetWithDetails } from '@/hooks/data/useTimesheets'

export default function TimesheetsPage() {
  const permissions = usePermissions()
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    employeeId: '',
    storeId: '',
    zoneId: ''
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetWithDetails | null>(null)

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      startDate: '',
      endDate: '',
      employeeId: '',
      storeId: '',
      zoneId: ''
    })
  }

  // Handle timesheet actions
  const handleEdit = (timesheet: TimesheetWithDetails) => {
    setEditingTimesheet(timesheet)
    setShowAddForm(true)
  }

  const handleAdd = () => {
    setEditingTimesheet(null)
    setShowAddForm(true)
  }

  const handleFormClose = () => {
    setShowAddForm(false)
    setEditingTimesheet(null)
  }

  const handleFormSuccess = () => {
    setShowAddForm(false)
    setEditingTimesheet(null)
    // The table will automatically refresh due to React Query invalidation
  }

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
          <div className="px-4 py-6 sm:px-0">
            
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
                  <p className="text-gray-600">Manage employee time records</p>
                </div>
                
                {permissions.canCreateTimesheets && (
                  <Button onClick={handleAdd}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Timesheet
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input
                  label="Search"
                  placeholder="Search employees..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
                
                <Input
                  label="Start Date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
                
                <Input
                  label="End Date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
                
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // Export functionality will be added later
                      alert('Export functionality coming soon!')
                    }}
                    disabled={!permissions.canExportTimesheets}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-4-4m4 4l4-4m6-2V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h8.5" />
                    </svg>
                    Export
                  </Button>
                </div>
              </div>
              
              {/* Active Filters Display */}
              {Object.entries(filters).some(([_, value]) => value) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Active filters:</span>
                    {Object.entries(filters).map(([key, value]) => 
                      value ? (
                        <span
                          key={key}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {key}: {value}
                          <button
                            onClick={() => handleFilterChange(key, '')}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Timesheet Table */}
            <TimesheetTable
              filters={filters}
              onEdit={handleEdit}
            />

            {/* Add/Edit Form Modal */}
            {showAddForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {editingTimesheet ? 'Edit Timesheet' : 'Add New Timesheet'}
                      </h2>
                      <button
                        onClick={handleFormClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <TimesheetForm
                      timesheet={editingTimesheet}
                      onSuccess={handleFormSuccess}
                      onCancel={handleFormClose}
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}