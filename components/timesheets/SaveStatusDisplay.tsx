// components/timesheet/SaveStatusDisplay.tsx - Updated to show UPSERT info
'use client'

import { SaveResult } from '@/lib/services/timesheetSaveService'
import { Button } from '@/components/ui/Button'

interface SaveStatusDisplayProps {
  result: SaveResult | null
  onDismiss: () => void
  className?: string
}

/**
 * Component to display detailed save results with update/create breakdown
 */
export function SaveStatusDisplay({ 
  result, 
  onDismiss, 
  className = '' 
}: SaveStatusDisplayProps) {
  if (!result) return null

  const hasErrors = result.errors.length > 0
  const isPartialSuccess = result.success && hasErrors
  const updatedCount = result.savedTimesheets.filter(t => t.isUpdate).length
  const createdCount = result.savedTimesheets.filter(t => !t.isUpdate).length

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {result.success ? (
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          
          <h3 className={`font-medium ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {isPartialSuccess ? 'Partially Saved' : result.success ? 'Save Successful' : 'Save Failed'}
          </h3>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Summary with Session Info */}
      <div className={`p-3 rounded-md mb-3 ${
        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      } border`}>
        <div className="text-sm space-y-1">
          <p className={result.success ? 'text-green-700' : 'text-red-700'}>
            <span className="font-medium">{result.savedCount}</span> timesheet{result.savedCount !== 1 ? 's' : ''} processed
            {hasErrors && (
              <>, <span className="font-medium text-red-600">{result.failedCount}</span> failed</>
            )}
          </p>
          
          {/* ✅ NEW: Show update vs create breakdown */}
          {result.success && (
            <div className="text-xs text-gray-600 space-y-1">
              {createdCount > 0 && (
                <p>• <span className="font-medium">{createdCount}</span> new timesheet{createdCount !== 1 ? 's' : ''} created</p>
              )}
              {updatedCount > 0 && (
                <p>• <span className="font-medium">{updatedCount}</span> existing timesheet{updatedCount !== 1 ? 's' : ''} updated</p>
              )}
              <p>• Session: <span className="font-mono text-xs">{result.sessionId.slice(-12)}</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Success List with Update/Create Icons */}
      {result.savedTimesheets.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-green-800 mb-2">
            ✓ Successfully Processed ({result.savedTimesheets.length})
          </h4>
          <div className="space-y-1">
            {result.savedTimesheets.map(saved => (
              <div 
                key={saved.employeeId}
                className="text-sm text-green-700 bg-green-50 px-2 py-1 rounded flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  {/* ✅ NEW: Show update vs create icon */}
                  {saved.isUpdate ? (
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  <span>{saved.employeeName}</span>
                  <span className="text-xs text-gray-500">
                    {saved.isUpdate ? 'updated' : 'created'}
                  </span>
                </div>
                <span className="text-xs font-mono text-green-600">
                  {saved.timesheetId.slice(-8)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error List */}
      {hasErrors && (
        <div>
          <h4 className="text-sm font-medium text-red-800 mb-2">
            ⚠ Failed to Save ({result.errors.length})
          </h4>
          <div className="space-y-2">
            {result.errors.map((error, index) => (
              <div 
                key={index}
                className="text-sm bg-red-50 border border-red-200 rounded p-2"
              >
                <div className="font-medium text-red-700">
                  {error.employeeName}
                </div>
                <div className="text-red-600 text-xs mt-1">
                  {error.error}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}