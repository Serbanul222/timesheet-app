'use client'

import { Button } from '@/components/ui/Button'
import { formatHours } from '@/lib/utils'

interface TimesheetGridFooterProps {
  totalHours: number
  employeeCount: number
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  readOnly: boolean
}

export function TimesheetGridFooter({
  totalHours,
  employeeCount,
  onSave,
  onCancel,
  isSaving,
  readOnly
}: TimesheetGridFooterProps) {
  return (
    <div className="timesheet-grid-footer border-t-2 border-gray-300 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        {/* Summary Stats */}
        <div className="flex items-center space-x-6">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{employeeCount}</span> employees
          </div>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-lg text-blue-700">{formatHours(totalHours)}</span>
          </div>
          <div className="text-sm text-gray-600">
            Average: <span className="font-medium">
              {employeeCount > 0 ? formatHours(totalHours / employeeCount) : '0h'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            
            <Button
              onClick={onSave}
              loading={isSaving}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Timesheet'}
            </Button>
          </div>
        )}

        {/* Read-only indicator */}
        {readOnly && (
          <div className="flex items-center space-x-2 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="text-sm">Read Only</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!readOnly && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Double-click on hours to edit • Click status badges to cycle through options</p>
            <p>• CO = Vacation, CM = Medical Leave, D = Dispensation</p>
          </div>
        </div>
      )}
    </div>
  )
}