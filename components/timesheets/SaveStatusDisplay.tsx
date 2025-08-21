// components/timesheets/SaveStatusDisplay.tsx - Updated for multi-employee timesheets
'use client'

import { SaveResult } from '@/lib/services/timesheetSaveService'
import { Button } from '@/components/ui/Button'

interface SaveStatusDisplayProps {
  result: SaveResult | null
  onDismiss: () => void
  className?: string
}

/**
 * ✅ UPDATED: Component to display multi-employee timesheet save results
 */
export function SaveStatusDisplay({ 
  result, 
  onDismiss, 
  className = '' 
}: SaveStatusDisplayProps) {
  if (!result) return null

  const hasErrors = result.errors.length > 0
  const isSuccess = result.success && result.timesheetId !== null

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isSuccess ? (
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          
          <h3 className={`font-medium ${
            isSuccess ? 'text-green-800' : 'text-red-800'
          }`}>
            {hasErrors && isSuccess ? 'Partially Saved' : 
             isSuccess ? (result.isUpdate ? 'Timesheet Updated' : 'Timesheet Created') : 
             'Salvarea a eșuat'}
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

      {/* Success Summary */}
      {isSuccess && (
        <div className={`p-3 rounded-md mb-3 ${
          hasErrors ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
        } border`}>
          <div className="text-sm space-y-1">
            <p className={hasErrors ? 'text-yellow-700' : 'text-green-700'}>
              <span className="font-medium">
                {result.isUpdate ? 'Updated' : 'Created'} pontaj
              </span> pentru <span className="font-medium">{result.employeeCount}</span> angajat{result.employeeCount !== 1 ? 's' : ''}
            </p>
            
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Total ore: <span className="font-medium text-blue-600">{result.totalHours}h</span></p>
              <p>• ID pontaj: <span className="font-mono text-xs">{result.timesheetId}</span></p>
              <p>• Sesiune: <span className="font-mono text-xs">{result.sessionId.slice(-12)}</span></p>
              {result.isUpdate && (
                <p>• <span className="text-blue-600">Pontajul existent a fost actualizat</span></p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error List */}
      {hasErrors && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">
            ⚠ Erori angajați ({result.errors.length})
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

      {/* Complete Failure */}
      {!isSuccess && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200">
          <div className="text-sm text-red-700">
            <p className="font-medium">Pontajul nu a putut fi salvat</p>
            <p className="mt-1">
              Niciun pontaj nu a fost creat. Vă rugăm să verificați datele și să încercați din nou.
            </p>
            {hasErrors && (
              <p className="mt-2 text-xs">
                {result.errors.length} angajat{result.errors.length !== 1 ? 'i' : ''} au avut erori de validare.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isSuccess && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {result.isUpdate ? 'Timesheet has been updated' : 'New timesheet created successfully'}
            </div>
            <div className="flex space-x-2">
              {hasErrors && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Could trigger a retry or show detailed error info
                    console.log('Show error details:', result.errors)
                  }}
                >
                  Vezi detalii
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onDismiss}
              >
                Continuă
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}