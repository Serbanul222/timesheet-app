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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { formatHours } from '@/lib/utils'
import { formatDateEuropean, getPeriodDisplay } from '@/lib/utils/dateFormatting'
import { usePermissions } from '@/hooks/auth/usePermissions'

interface TimesheetTableProps {
  filters?: {
    search?: string
    month?: Date
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
  } = useTimesheets({ month: filters.month })
  const { canEditTimesheets, canDeleteTimesheets } = usePermissions()

  const [selectedTimesheets, setSelectedTimesheets] = useState<string[]>([])
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [timesheetToDelete, setTimesheetToDelete] = useState<TimesheetWithDetails | null>(null)

  const filteredTimesheets = timesheets.filter(ts =>
    ts.employee?.full_name?.toLowerCase().includes(filters.search?.toLowerCase() || '')
  )

  // Open confirmation dialog
  const handleDeleteClick = (timesheet: TimesheetWithDetails) => {
    setTimesheetToDelete(timesheet)
    setIsConfirmDialogOpen(true)
  }

  // Handle the actual deletion after confirmation
  const handleConfirmDelete = () => {
    if (!timesheetToDelete) return
    
    deleteTimesheet(timesheetToDelete.id)
    setIsConfirmDialogOpen(false)
    setTimesheetToDelete(null)
  }

  // Cancel the deletion
  const handleCancelDelete = () => {
    setIsConfirmDialogOpen(false)
    setTimesheetToDelete(null)
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
        <h3 className="text-lg font-medium text-red-600">Eroare la încărcarea pontajelor</h3>
        <p className="text-gray-600">{error instanceof Error ? error.message : 'A apărut o eroare neașteptată'}</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[20%]">Angajat</TableHead>
              <TableHead className="w-[20%]">Perioadă</TableHead>
              <TableHead className="w-[10%] text-center">Ore</TableHead>
              <TableHead className="w-[15%]">Magazin</TableHead>
              <TableHead className="w-[15%]">Zonă</TableHead>
              <TableHead className="w-[10%]">Creat</TableHead>
              <TableHead className="w-[10%] text-right">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTimesheets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <p className="text-lg font-medium text-gray-500">Niciun pontaj găsit</p>
                  <p className="text-sm text-gray-400">Încearcă să ajustezi filtrele</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredTimesheets.map((timesheet) => (
                <TableRow key={timesheet.id} data-state={selectedTimesheets.includes(timesheet.id) ? 'selected' : undefined}>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {timesheet.employee?.full_name || 'Angajat necunoscut'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {timesheet.employee?.employee_code || 'Fără cod'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPeriodDisplay(timesheet.period_start, timesheet.period_end)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                      {formatHours(timesheet.total_hours)}
                    </span>
                  </TableCell>
                  <TableCell>{timesheet.store?.name || 'Magazin necunoscut'}</TableCell>
                  <TableCell>{timesheet.zone?.name || 'Zonă necunoscută'}</TableCell>
                  <TableCell>{formatDateEuropean(timesheet.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {canEditTimesheets && onEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onEdit(timesheet)}>
                          Editează
                        </Button>
                      )}
                      {canDeleteTimesheets && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(timesheet)}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          Șterge
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

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent size="sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirmă ștergerea pontajului</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi pontajul pentru <strong>{timesheetToDelete?.employee?.full_name}</strong>?
              <br />
              <span className="text-xs text-gray-400 mt-2 block">
                Perioada: {timesheetToDelete && getPeriodDisplay(timesheetToDelete.period_start, timesheetToDelete.period_end)}
                <br />
                Total Ore: {timesheetToDelete && formatHours(timesheetToDelete.total_hours)}
              </span>
              <br />
              <span className="text-red-600 text-sm font-medium">Această acțiune este ireversibilă</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              Anulează
            </Button>
            <Button 
              variant="default" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Se șterge...' : 'Șterge pontajul'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}