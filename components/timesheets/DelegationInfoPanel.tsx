// components/timesheets/DelegationInfoPanel.tsx
'use client'

import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'

interface DelegationInfoPanelProps {
  delegatedEmployees: EmployeeWithDetails[]
}

export function DelegationInfoPanel({ delegatedEmployees }: DelegationInfoPanelProps) {
  if (delegatedEmployees.length === 0) {
    return null
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800">Notificare Angajați Delegați</h4>
          <div className="text-sm text-amber-700 mt-1">
            <p>
              Acest magazin are în prezent {delegatedEmployees.length} angajat{delegatedEmployees.length !== 1 ? 'i' : ''} delegat{delegatedEmployees.length !== 1 ? 'i' : ''}.
              Acești angajați sunt temporar repartizați de la alte magazine și se vor întoarce automat la magazinele lor de origine când delegațiile expiră.
            </p>
            <div className="mt-2 space-y-1">
              {delegatedEmployees.map(emp => (
                <div key={emp.id} className="text-xs">
                  • <strong>{emp.full_name}</strong> de la {emp.delegation?.from_store_name}
                  (expiră {formatDateEuropean(emp.delegation?.valid_until || '')})
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}