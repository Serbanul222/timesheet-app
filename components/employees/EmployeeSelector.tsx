// FILE: components/employees/EmployeeSelector.tsx - CORRECTED
'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'

// ✅ FIX: The interface expects 'onSelectionChange', matching what it receives.
interface EmployeeSelectorProps {
  employees: EmployeeWithDetails[]
  selectedIds: string[]
  onSelectionChange: (selectedIds: string[]) => void; // This is the correct prop
  maxHeight?: string
  className?: string
  storeId?: string
  historicalEmployees?: EmployeeWithDetails[]
}

export function EmployeeSelector({
  employees,
  selectedIds,
  onSelectionChange, // ✅ It correctly receives the prop here
  maxHeight = '300px',
  className = '',
  storeId,
  historicalEmployees = []
}: EmployeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const hasStoreSelected = storeId && storeId.trim() !== ''

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const term = searchTerm.toLowerCase();
    return employees.filter(emp => emp.full_name.toLowerCase().includes(term));
  }, [employees, searchTerm]);

  // This is your original logic, which is correct for this pattern.
  // It calculates the new list and sends it to the parent.
  const handleEmployeeToggle = (employeeId: string) => {
    const newSelection = selectedIds.includes(employeeId)
      ? selectedIds.filter(id => id !== employeeId)
      : [...selectedIds, employeeId];
    onSelectionChange(newSelection); // ✅ It correctly CALLS the prop here
  };
  
  // No other logic changes are needed. The rest is for rendering.
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
          disabled={!hasStoreSelected}
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
                getRowStyle={getRowStyle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-component for a single row
interface EmployeeRowProps {
  employee: EmployeeWithDetails;
  isSelected: boolean;
  onToggle: () => void;
  getRowStyle: (employee: EmployeeWithDetails) => string;
}

function EmployeeRow({ employee, isSelected, onToggle, getRowStyle }: EmployeeRowProps) {
  return (
    <label className={getRowStyle(employee)}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{employee.full_name}</div>
        <div className="text-xs text-gray-600">{employee.position || 'Staff'}</div>
      </div>
    </label>
  );
}