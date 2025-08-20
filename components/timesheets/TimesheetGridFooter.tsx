// components/timesheets/TimesheetGridFooter.tsx - Fixed with proper validation
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
  canSave?: boolean
  validationSummary?: string
  hasValidationErrors?: boolean
  hasSetupErrors?: boolean
}

export function TimesheetGridFooter({
  totalHours,
  employeeCount,
  onSave,
  onCancel,
  isSaving,
  readOnly,
  canSave = true,
  validationSummary,
  hasValidationErrors = false,
  hasSetupErrors = false
}: TimesheetGridFooterProps) {
  return (
    <div className="timesheet-grid-footer border-t-2 border-gray-300 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        {/* Summary Stats */}
        <div className="flex items-center space-x-6">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{employeeCount}</span> angajați
          </div>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-lg text-blue-700">{formatHours(totalHours)}</span>
          </div>
          
          {/* Validation Status Indicator */}
          {(hasValidationErrors || hasSetupErrors) && (
            <div className="flex items-center text-sm font-medium">
              {hasSetupErrors ? (
                <>
                  <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-blue-600">Setări necesare</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-600">Nu se poate salva: {validationSummary}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="flex items-center space-x-3">
             <Button variant="outline" size="sm" onClick={onCancel}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Înapoi la Listă
        </Button>
            
            <Button
              onClick={onSave}
              loading={isSaving}
              disabled={isSaving || !canSave || hasValidationErrors || hasSetupErrors}
              className={(hasValidationErrors || hasSetupErrors) ? 'opacity-50 cursor-not-allowed' : ''}
              title={
                hasSetupErrors ? 'Complete setup to enable saving' :
                hasValidationErrors ? 'Fix validation errors to save' : 
                'Salvează pontaj'
              }
            >
              {isSaving ? 'Salvăm...' : 'Salvează pontaj'}
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
            <span className="text-sm">Doar citire</span>
          </div>
        )}
      </div>

      {/* Enhanced Instructions */}
      {!readOnly && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">⏰ Înregistrare Timp</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• <strong>Dublu-click</strong> pe orice celulă pentru a seta un interval de timp</p>
                <p>• <strong>Exemple:</strong> "10-12" (2h), "9:30-17:30" (8h), "22-06" (8h peste noapte)</p>
                <p>• <strong>Auto-calculare:</strong> Orele apar în albastru automat</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-800 mb-2">📝 Status & Comentarii</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• <strong>Status:</strong> Selectați din dropdown - unele absențe permit ore parțiale</p>
                <p>• <strong>Comentarii:</strong> Click dreapta pe celule pentru a adăuga note • Punctele portocalii indică comentarii</p>
                <p>• <strong>Validare:</strong> Orele lucrătoare și absențele de o zi întreagă nu pot fi combinate</p>
              </div>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 bg-blue-50 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h5 className="text-sm font-medium text-blue-800">💡 Reguli de Validare</h5>
                <div className="text-xs text-blue-700 mt-1 space-y-1">
                  <p>• Orele lucrătoare și absențele de o zi întreagă (OFF, CO, Dispensație) nu pot fi combinate</p>
                  <p>• Unele absențe, cum ar fi Concediul Medical (CM), pot avea ore parțiale</p>
                  <p>• Contururile roșii indică erori de validare care trebuie corectate înainte de salvare</p>
                  <p>• Contururile galbene indică avertismente care permit salvarea, dar ar trebui revizuite</p>
                  <p>• Selectarea magazinului este necesară înainte ca angajații să poată fi selectați</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}