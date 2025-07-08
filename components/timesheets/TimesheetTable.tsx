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
import { usePermissions } from '@/hooks/auth/usePermissions'

interface TimesheetTableProps {
  filters?: {
    search?: string
  }
  onEdit?: (timesheet: TimesheetWithDetails) => void
}

export function TimesheetTable({ 
  filters = {}, 
  onEdit, 
}: TimesheetTableProps) {
  const { 
    timesheets, 
    isLoading, 
    error, 
    deleteTimesheet, 
    isDeleting,
  } = useTimesheets(filters)
  const { canEdit, canDelete } = usePermissions()

  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([])

  const filteredTimesheets = timesheets.filter(ts =>
    ts.employee?.full_name?.toLowerCase().includes(filters.search?.toLowerCase() || '')
  )

  const handleDelete = (timesheet: TimesheetWithDetails) => {
    if (window.confirm(`Are you sure you want to delete the timesheet for ${timesheet.employee?.full_name}?`)) {
      deleteTimesheet(timesheet.id)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded my-2"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h3 className="text-lg font-medium text-red-600">Error Loading Timesheets</h3>
        <p className="text-gray-600">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20%]">Employee</TableHead>
            <TableHead className="w-[20%]">Period</TableHead>
            <TableHead className="w-[10%] text-center">Hours</TableHead>
            <TableHead className="w-[15%]">Store</TableHead>
            <TableHead className="w-[15%]">Zone</TableHead>
            <TableHead className="w-[10%]">Created</TableHead>
            <TableHead className="w-[10%] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTimesheets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12">
                <p className="text-lg font-medium text-gray-500">No timesheets found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters.</p>
              </TableCell>
            </TableRow>
          ) : (
            filteredTimesheets.map((timesheet) => (
              <TableRow key={timesheet.id} data-state={selectedTimesheets.includes(timesheet.id) ? 'selected' : undefined}>
                <TableCell>
                  <div className="font-medium text-gray-900">
                    {timesheet.employee?.full_name || 'Unknown Employee'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {timesheet.employee?.employee_code || 'No Code'}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDate(timesheet.period_start)} to {formatDate(timesheet.period_end)}
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                    {formatHours(timesheet.total_hours)}
                  </span>
                </TableCell>
                <TableCell>{timesheet.store?.name || 'Unknown Store'}</TableCell>
                <TableCell>{timesheet.zone?.name || 'Unknown Zone'}</TableCell>
                <TableCell>{formatDate(timesheet.created_at)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {canEdit && onEdit && (
                      <Button variant="ghost" size="sm" onClick={() => onEdit(timesheet)}>
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