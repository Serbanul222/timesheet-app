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

      {/* Enhanced Instructions */}
      {!readOnly && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">⏰ Time Entry</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• <strong>Double-click</strong> any cell to enter time intervals</p>
                <p>• <strong>Examples:</strong> "10-12" (2h), "9:30-17:30" (8h), "22-06" (8h overnight)</p>
                <p>• <strong>Auto-calculation:</strong> Hours appear in blue automatically</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">📝 Status & Comments</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• <strong>Status:</strong> Click badges to cycle: Off → CO (Vacation) → CM (Medical) → D (Dispensation)</p>
                <p>• <strong>Comments:</strong> Right-click cells to add notes • Orange dots indicate comments</p>
                <p>• <strong>Navigation:</strong> Tab/Enter to move between cells, Esc to cancel</p>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 bg-blue-50 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h5 className="text-sm font-medium text-blue-800">💡 Pro Tips</h5>
                <div className="text-xs text-blue-700 mt-1 space-y-1">
                  <p>• Use consistent time formats across your team for better reporting</p>
                  <p>• Add comments for breaks, overtime reasons, or special circumstances</p>
                  <p>• Save regularly to prevent data loss - changes auto-calculate but aren't saved until you click Save</p>
                  <p>• Overnight shifts (like "22-06") are automatically calculated as 8 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}