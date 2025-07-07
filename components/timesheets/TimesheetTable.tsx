'use client'
import { useState } from 'react'
import { useTimesheets, type TimesheetWithDetails } from '@/hooks/data/useTimesheets'
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { formatDate, formatHours } from '@/lib/utils'

interface TimesheetTableProps {
  filters?: {
    employeeId?: string
    storeId?: string
    zoneId?: string
    startDate?: string
    endDate?: string
    search?: string
  }
  onEdit?: (timesheet: TimesheetWithDetails) => void
  onDelete?: (timesheet: TimesheetWithDetails) => void
  // Removed onAdd prop since it's handled in the parent page
}

export function TimesheetTable({ 
  filters = {}, 
  onEdit, 
  onDelete
}: TimesheetTableProps) {
  const { 
    timesheets, 
    isLoading, 
    error, 
    deleteTimesheet, 
    isDeleting,
    canEdit,
    canDelete
  } = useTimesheets(filters)

  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([])
  const [sortField, setSortField] = useState<keyof TimesheetWithDetails>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Handle sorting (like a Comparator in Java)
  const handleSort = (field: keyof TimesheetWithDetails) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort timesheets
  const sortedTimesheets = [...timesheets].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue == null) return 1
    if (bValue == null) return -1
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Handle row selection
  const handleSelectTimesheet = (timesheetId: string) => {
    setSelectedTimesheets(prev => 
      prev.includes(timesheetId) 
        ? prev.filter(id => id !== timesheetId)
        : [...prev, timesheetId]
    )
  }

  const handleSelectAll = () => {
    setSelectedTimesheets(
      selectedTimesheets.length === timesheets.length 
        ? [] 
        : timesheets.map(t => t.id)
    )
  }

  // Handle delete with confirmation
  const handleDelete = (timesheet: TimesheetWithDetails) => {
    if (window.confirm(`Are you sure you want to delete the timesheet for ${timesheet.employee?.full_name}?`)) {
      deleteTimesheet(timesheet.id)
    }
  }

  // Get sort icon
  const getSortIcon = (field: keyof TimesheetWithDetails) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

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
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Timesheets
            </h3>
            <p className="text-sm text-gray-500">
              {timesheets.length} timesheet{timesheets.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          {/* Only show bulk actions if timesheets are selected */}
          {selectedTimesheets.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {selectedTimesheets.length} selected
              </span>
              {canDelete && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Delete ${selectedTimesheets.length} selected timesheets?`)) {
                      selectedTimesheets.forEach(id => deleteTimesheet(id))
                      setSelectedTimesheets([])
                    }
                  }}
                >
                  Delete Selected
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-4">
              <input
                type="checkbox"
                checked={selectedTimesheets.length === timesheets.length && timesheets.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 focus:ring-blue-500"
              />
            </TableHead>
            
            <TableHead>
              <button
                onClick={() => handleSort('employee')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Employee</span>
                {getSortIcon('employee')}
              </button>
            </TableHead>
            
            <TableHead>
              <button
                onClick={() => handleSort('period_start')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Period</span>
                {getSortIcon('period_start')}
              </button>
            </TableHead>
            
            <TableHead>
              <button
                onClick={() => handleSort('total_hours')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Hours</span>
                {getSortIcon('total_hours')}
              </button>
            </TableHead>
            
            <TableHead>Store</TableHead>
            <TableHead>Zone</TableHead>
            
            <TableHead>
              <button
                onClick={() => handleSort('created_at')}
                className="flex items-center space-x-1 hover:text-gray-700"
              >
                <span>Created</span>
                {getSortIcon('created_at')}
              </button>
            </TableHead>
            
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {sortedTimesheets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg font-medium">No timesheets found</p>
                  <p className="text-sm">Try adjusting your filters or create a new timesheet.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            sortedTimesheets.map((timesheet) => (
              <TableRow key={timesheet.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedTimesheets.includes(timesheet.id)}
                    onChange={() => handleSelectTimesheet(timesheet.id)}
                    className="rounded border-gray-300 focus:ring-blue-500"
                  />
                </TableCell>
                
                <TableCell>
                  <div>
                    <div className="font-medium text-gray-900">
                      {timesheet.employee?.full_name || 'Unknown Employee'}
                    </div>
                    {timesheet.employee?.employee_code && (
                      <div className="text-sm text-gray-500">
                        #{timesheet.employee.employee_code}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm">
                    <div>{formatDate(timesheet.period_start)}</div>
                    <div className="text-gray-500">to {formatDate(timesheet.period_end)}</div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {formatHours(timesheet.total_hours)}
                  </span>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm text-gray-900">
                    {timesheet.store?.name || 'Unknown Store'}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm text-gray-900">
                    {timesheet.zone?.name || 'Unknown Zone'}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm text-gray-500">
                    {formatDate(timesheet.created_at)}
                  </div>
                </TableCell>
                
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {canEdit && onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(timesheet)}
                      >
                        Edit
                      </Button>
                    )}
                    
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(timesheet)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}