// FILE: components/timesheets/EmployeeSelectionPanel.tsx - FINAL VERSION WITH SMART BUTTON
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmployeeSelector } from '@/components/employees/EmployeeSelector'
import { EmployeeQuickAddWithLookup as EmployeeQuickAdd } from '@/components/employees/EmployeeQuickAddWithLookup'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

interface EmployeeSelectionPanelProps {
  storeId?: string
  selectedEmployeeIds: string[]
  employees: EmployeeWithDetails[] // Aceștia sunt acum DOAR angajații activi
  regularEmployees: EmployeeWithDetails[]
  delegatedEmployees: EmployeeWithDetails[]
  historicalEmployees: EmployeeWithDetails[]
  isLoading: boolean
  isSaving: boolean
  hasStoreSelected: boolean
  existingTimesheetId?: string
  showDelete?: boolean
  readOnly?: boolean
  onSelectionChange: (employeeIds: string[]) => void
  onEmployeeAdded: (newEmployee: any) => void
  onEmployeeDelete?: (employeeId: string) => void
  onEmployeeBulkDelete?: (employeeIds: string[]) => void
  
  // [MODIFICAREA CHEIE] Prop nou pentru a controla vizibilitatea butonului de bulk
  activeSelectedIdsForBulkDelete: string[]
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
  showDelete = false,
  readOnly = false,
  onSelectionChange,
  onEmployeeAdded,
  onEmployeeDelete,
  onEmployeeBulkDelete,
  // [MODIFICAREA CHEIE] Primim noul prop
  activeSelectedIdsForBulkDelete,
}: EmployeeSelectionPanelProps) {
  const [showAddEmployee, setShowAddEmployee] = useState(false)

  const handleBulkDelete = () => {
    if (!onEmployeeBulkDelete || activeSelectedIdsForBulkDelete.length === 0) return;
    const count = activeSelectedIdsForBulkDelete.length;
    if (confirm(`Ești sigur că vrei să DEZACTIVEZI ${count} angajat${count !== 1 ? 'i' : ''} selectați?`)) {
      onEmployeeBulkDelete(activeSelectedIdsForBulkDelete);
    }
  }

  return (
    <div>
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

          {/* [MODIFICAREA CHEIE] Butonul este acum controlat de noua listă și noua regulă (>= 2) */}
          {activeSelectedIdsForBulkDelete.length >= 2 && !readOnly && onEmployeeBulkDelete && (
            <Button 
              type="button" 
              variant="destructive"
              size="sm" 
              onClick={handleBulkDelete}
              disabled={isSaving}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Dezactivează selectați ({activeSelectedIdsForBulkDelete.length})
            </Button>
          )}

          <Button type="button" variant="outline" size="sm" onClick={() => setShowAddEmployee(true)} disabled={isLoading || !storeId || isSaving || readOnly}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> 
            Adaugă angajat
          </Button>
        </div>
      </div>
      
      {showAddEmployee && storeId && ( <EmployeeQuickAdd onEmployeeAdded={onEmployeeAdded} onCancel={() => setShowAddEmployee(false)} preselectedStoreId={storeId} /> )}
     
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div><span className="ml-2 text-sm text-gray-600">Încărcare angajați...</span></div>
      ) : (
        <EmployeeSelector
          employees={employees} // Primește doar angajații activi
          selectedIds={selectedEmployeeIds} // Primește toți cei din grilă, pentru a bifa corect
          onSelectionChange={onSelectionChange}
          onEmployeeDelete={onEmployeeDelete}
          showDelete={showDelete}
          readOnly={readOnly}
          storeId={storeId}
          historicalEmployees={historicalEmployees}
          maxHeight="150px"
        />
      )}
    </div>
  )
}