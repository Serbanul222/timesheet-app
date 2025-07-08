'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useTimesheets } from '@/hooks/data/useTimesheets'
import { formatDate } from '@/lib/utils'

interface TimesheetListViewProps {
  onEditTimesheet: (timesheetId: string) => void
  onCreateGrid: () => void
}

export function TimesheetListView({
  onEditTimesheet,
  onCreateGrid
}: TimesheetListViewProps) {
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  })

  const { timesheets, isLoading, error } = useTimesheets(filters)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Timesheets</h3>
          <p className="text-gray-600 mb-4">Failed to load timesheet data</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search"
            placeholder="Search employees..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
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
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
          
          <Input
            label="End Date"
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Getting Started Card */}
      {timesheets.length === 0 && !filters.search && !filters.startDate && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Welcome to the New Grid Timesheet System!
              </h3>
              <p className="text-gray-600 mb-4">
                Create Excel-like timesheet grids for multiple employees. Edit hours and statuses inline, 
                just like in your spreadsheet example.
              </p>
              
              <div className="flex items-center space-x-3">
                <Button onClick={onCreateGrid}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Grid
                </Button>
                
                <Button variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  View Tutorial
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Timesheets List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Individual Timesheets
            </h3>
            <span className="text-sm text-gray-500">
              {timesheets.length} timesheet{timesheets.length !== 1 ? 's' : ''} found
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Legacy individual timesheet entries
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {timesheets.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No timesheets found</h4>
              <p className="text-gray-600">
                {filters.search || filters.startDate 
                  ? 'Try adjusting your filters'
                  : 'No individual timesheets have been created yet'
                }
              </p>
            </div>
          ) : (
            timesheets.map((timesheet) => (
              <div key={timesheet.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {timesheet.employee?.full_name || 'Unknown Employee'}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500">
                            {formatDate(timesheet.period_start)} - {formatDate(timesheet.period_end)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {timesheet.total_hours}h
                          </span>
                          <span className="text-sm text-gray-500">
                            {timesheet.store?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditTimesheet(timesheet.id)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">New Grid System</h4>
            <div className="mt-1 text-sm text-blue-700">
              <p>
                The new grid system allows you to manage multiple employees' timesheets in one view, 
                similar to Excel. You can edit hours directly in cells and set statuses with one click.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}