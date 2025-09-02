// components/timesheets/DuplicationModal.tsx - FINAL with improved cancel button
'use client'

import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { type ExistingTimesheetInfo } from '@/lib/validation/timesheetDuplicationRules'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'
import { formatHours } from '@/lib/utils'
// Added the 'X' icon for the cancel button
import { AlertTriangle, Calendar, Edit, ShieldX, X } from 'lucide-react'

interface DuplicationModalProps {
  isOpen: boolean
  onClose: () => void
  existingTimesheet: ExistingTimesheetInfo | null
  conflictType: 'exact_period' | 'overlapping_period' | 'same_month' | null
  newTimesheetInfo: {
    startDate: string
    endDate: string
    storeName: string
    employeeCount: number
  }
  onEditExisting: () => void
  onCreateDifferent: () => void
  onForceCreate?: () => void
  showForceOption?: boolean
}

export function DuplicationModal({
  isOpen,
  onClose,
  existingTimesheet,
  conflictType,
  newTimesheetInfo,
  onEditExisting,
  onCreateDifferent,
  onForceCreate,
  showForceOption = false
}: DuplicationModalProps) {
  if (!existingTimesheet || !conflictType) return null

  const conflictDetails = {
    title: 'Pontaj existent pentru această perioadă',
    description: `Există deja un pontaj pentru aceeași perioadă la ${existingTimesheet.store?.name || 'acest magazin'}. Vă recomandăm să editați pontajul existent.`,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="lg" className="p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {conflictDetails.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-slate-500">
                {conflictDetails.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h4 className="text-sm font-medium text-slate-600 mb-3">Detalii pontaj existent</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500">Perioadă:</span>
                <p className="font-medium text-slate-800">
                  {formatDateEuropean(existingTimesheet.period_start)} - {formatDateEuropean(existingTimesheet.period_end)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Total ore:</span>
                <p className="font-medium text-slate-800">{formatHours(existingTimesheet.total_hours)}</p>
              </div>
              <div>
                <span className="text-slate-500">Angajați:</span>
                <p className="font-medium text-slate-800">{existingTimesheet.employee_count} angajați</p>
              </div>
              <div>
                <span className="text-slate-500">Creat la:</span>
                <p className="font-medium text-slate-800">{formatDateEuropean(existingTimesheet.created_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons with the updated "Anulează" button */}
        <div className="pt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          {/* ✅ THIS IS THE FIX ✅ */}
          {/* Changed variant from "ghost" to "outline" and added the X icon */}
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            Anulează
          </Button>
          <Button
            onClick={onCreateDifferent}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Alege altă perioadă
          </Button>
          <Button
            onClick={onEditExisting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 mb-2 sm:mb-0"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editează pontajul existent
          </Button>
          {showForceOption && onForceCreate && (
             <Button
              onClick={onForceCreate}
              variant="destructive"
              className="mt-2 sm:mt-0 w-full sm:w-auto"
            >
              <ShieldX className="w-4 h-4 mr-2" />
              Forțează crearea
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}