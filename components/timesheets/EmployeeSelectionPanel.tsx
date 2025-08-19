// FILE: components/timesheets/EmployeeSelectionPanel.tsx - CORRECTED
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmployeeSelector } from '@/components/employees/EmployeeSelector'
import { EmployeeQuickAddWithLookup as EmployeeQuickAdd } from '@/components/employees/EmployeeQuickAddWithLookup'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

// ✅ FIX: The interface is corrected to expect 'onSelectionChange', matching the parent.
interface EmployeeSelectionPanelProps {
  storeId?: string
  selectedEmployeeIds: string[]
  employees: EmployeeWithDetails[]
  regularEmployees: EmployeeWithDetails[]
  delegatedEmployees: EmployeeWithDetails[]
  historicalEmployees: EmployeeWithDetails[]
  isLoading: boolean
  isSaving: boolean
  hasStoreSelected: boolean
  existingTimesheetId?: string
  onSelectionChange: (employeeIds: string[]) => void; // This is the correct prop
  onEmployeeAdded: (newEmployee: any) => void
}

export function EmployeeSelectionPanel({
  storeId,
  selectedEmployeeIds,
  employees,
  regularEmployees,
  delegatedEmployees,
  historicalEmployees,
  isLoading,
  isSaving,
  hasStoreSelected,
  existingTimesheetId,
  onSelectionChange, // ✅ It correctly receives the prop here
  onEmployeeAdded,
}: EmployeeSelectionPanelProps) {
  const [showAddEmployee, setShowAddEmployee] = useState(false)

  return (
    <div>
      {/* Header and other UI elements remain the same */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <label className="block text-sm font-medium text-gray-900">Selectează angajații</label>
          <div className="flex items-center space-x-2 text-xs">
            {historicalEmployees.length > 0 && <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded">{historicalEmployees.length} din pontaj</div>}
            {delegatedEmployees.length > 0 && <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded">{delegatedEmployees.length} delegați</div>}
            {regularEmployees.length > 0 && <div className="text-green-600 bg-green-50 px-2 py-1 rounded">{regularEmployees.length} regulat</div>}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">{selectedEmployeeIds.length} angajaț{selectedEmployeeIds.length !== 1 ? 'i' : ''} selectați</div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddEmployee(true)} disabled={isLoading || !storeId || isSaving}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Adaugă angajat
          </Button>
        </div>
      </div>

      {showAddEmployee && storeId && (
        <EmployeeQuickAdd onEmployeeAdded={onEmployeeAdded} onCancel={() => setShowAddEmployee(false)} preselectedStoreId={storeId} />
      )}
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><span className="ml-2 text-sm text-gray-600">Încărcare angajați...</span></div>
      ) : (
        <EmployeeSelector 
            employees={employees} 
            selectedIds={selectedEmployeeIds} 
            onSelectionChange={onSelectionChange} // ✅ It correctly PASSES the prop down
            storeId={storeId} 
            historicalEmployees={historicalEmployees}
            maxHeight="150px"
        />
      )}
    </div>
  )
}