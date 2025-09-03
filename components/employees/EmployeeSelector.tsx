// FILE: components/employees/EmployeeSelector.tsx - WITH DEBUG LOGS
'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

interface EmployeeSelectorProps {
  employees: EmployeeWithDetails[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void
  onEmployeeDelete?: (employeeId: string) => void
  maxHeight?: string
  className?: string
  storeId?: string
  historicalEmployees?: EmployeeWithDetails[]
  showDelete?: boolean
  readOnly?: boolean
}

export function EmployeeSelector({
  employees,
  selectedIds,
  onSelectionChange,
  onEmployeeDelete,
  maxHeight = '300px',
  className = '',
  storeId,
  historicalEmployees = [],
  showDelete = false,
  readOnly = false
}: EmployeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const hasStoreSelected = storeId && storeId.trim() !== ''

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(emp => emp.full_name.toLowerCase().includes(term));
  }, [employees, searchTerm]);

  const handleEmployeeToggle = (employeeId: string) => {
    const newSelection = selectedIds.includes(employeeId)
      ? selectedIds.filter(id => id !== employeeId)
      : [...selectedIds, employeeId];
    onSelectionChange(newSelection);
  };
  
  const getRowStyle = (employee: EmployeeWithDetails) => {
    let base = "flex items-center p-3 cursor-pointer transition-colors";
    const isSelected = selectedIds.includes(employee.id);
    if (employee.isHistorical) return `${base} bg-gray-50 border-l-4 border-l-blue-400 ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'}`;
    if (employee.isDelegated) return `${base} bg-purple-50 border-l-4 border-l-purple-400 ${isSelected ? 'bg-purple-100' : 'hover:bg-purple-75'}`;
    return `${base} ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`;
  };

  return (
    <div className={`border border-gray-300 rounded-md ${className}`}>
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <Input
          placeholder="Caută angajați..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={!hasStoreSelected || readOnly}
        />
      </div>

      <div className="overflow-y-auto" style={{ maxHeight }}>
        {!hasStoreSelected ? (
          <div className="p-8 text-center text-gray-500">Selectați un magazin.</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Niciun rezultat.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                isSelected={selectedIds.includes(employee.id)}
                onToggle={() => handleEmployeeToggle(employee.id)}
                onDelete={onEmployeeDelete}
                getRowStyle={getRowStyle}
                showDelete={showDelete}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface EmployeeRowProps {
  employee: EmployeeWithDetails;
  isSelected: boolean;
  onToggle: () => void;
  onDelete?: (employeeId: string) => void;
  getRowStyle: (employee: EmployeeWithDetails) => string;
  showDelete?: boolean;
  readOnly?: boolean;
}

function EmployeeRow({ 
  employee, 
  isSelected, 
  onToggle, 
  onDelete,
  getRowStyle,
  showDelete = false,
  readOnly = false
}: EmployeeRowProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // <-- DEBUG LOG 1: Verificăm dacă handler-ul este apelat
    console.log(`[LOG 1 - EmployeeRow] Click pe ștergere pentru: ${employee.full_name} (ID: ${employee.id})`);

    if (onDelete) {
      onDelete(employee.id)
      setShowConfirm(false)
    } else {
      // <-- DEBUG LOG 1.1: Verificăm dacă funcția prop a fost primită
      console.error("[LOG 1.1 - EmployeeRow] EROARE: prop-ul 'onDelete' nu a fost furnizat!");
    }
  }

  const handleShowConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirm(true)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowConfirm(false)
  }

  return (
    <div className={`${getRowStyle(employee)} group relative`}>
      <label className="flex items-center flex-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
          disabled={readOnly}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{employee.full_name}</div>
          <div className="text-xs text-gray-600">{employee.position || 'Staff'}</div>
        </div>
      </label>
      
      {showDelete && !readOnly && onDelete && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 flex items-center">
          {showConfirm ? (
            <div className="flex items-center space-x-1 bg-white border rounded px-1 py-1 shadow-sm">
              <button onClick={handleDelete} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700" type="button">Da</button>
              <button onClick={handleCancel} className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" type="button">Nu</button>
            </div>
          ) : (
            <button onClick={handleShowConfirm} className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded" title={`Șterge ${employee.full_name} din pontaj`} type="button">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}