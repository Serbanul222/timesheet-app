// FILE: components/timesheets/TimesheetControls.tsx - REWRITTEN
'use client'

import { useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { useEmployees } from '@/hooks/data/useEmployees'
import { useStores } from '@/hooks/data/useStores'
import { type TimesheetGridData, type DayStatus, type TimesheetEntry } from '@/types/timesheet-grid'
import { generateDateRange, formatDateLocal } from '@/lib/timesheet-utils'

import { PeriodAndStoreSelector } from './PeriodAndStoreSelector'
import { EmployeeSelectionPanel } from './EmployeeSelectionPanel'
import { EmployeeDelegationPanel } from './EmployeeDelegationPanel'
import { DelegationInfoPanel } from './DelegationInfoPanel'
import { Button } from '@/components/ui/Button'

interface TimesheetControlsProps {
  timesheetData: TimesheetGridData;
  onUpdate: (data: Partial<TimesheetGridData>) => void;
  isSaving: boolean;
  existingTimesheetId?: string;
  originalData: TimesheetGridData | null;
  onCancel: () => void;
}

export function TimesheetControls({
  timesheetData,
  onUpdate,
  isSaving,
  existingTimesheetId,
  originalData,
  onCancel,
}: TimesheetControlsProps) {
  const { profile } = useAuth()
  const { stores, loadingStores } = useStores()

  const {
    employees,
    regularEmployees,
    delegatedEmployees,
    historicalEmployees,
    isLoading: loadingEmployees,
    refetch: refetchEmployees,
    hasStoreSelected,
  } = useEmployees({
    storeId: timesheetData.storeId,
    includeDelegated: true,
    timesheetId: existingTimesheetId,
  });

  const selectedEmployeeIds = useMemo(() => 
    timesheetData.entries.map((entry) => entry.employeeId),
    [timesheetData.entries]
  );

  const allAvailableEmployees = useMemo(() => {
    const employeeMap = new Map<string, any>(); 
    employees.forEach(emp => employeeMap.set(emp.id, emp));
    historicalEmployees.forEach(emp => employeeMap.set(emp.id, emp));
    return Array.from(employeeMap.values());
  }, [employees, historicalEmployees]);

  useEffect(() => {
    const isStoreManager = profile?.role === 'STORE_MANAGER';
    if (isStoreManager && profile.store_id && stores.length === 1 && timesheetData.storeId !== profile.store_id) {
      onUpdate({ storeId: profile.store_id, entries: [] });
    }
  }, [profile, stores, timesheetData.storeId, onUpdate]);

  const handleDelegationChange = () => {
    refetchEmployees();
  };
  
  const handleEmployeeSelection = (newlySelectedIds: string[]) => {
    const selectedEmployeeObjects = allAvailableEmployees.filter((emp) => newlySelectedIds.includes(emp.id));
    if (selectedEmployeeObjects.length === 0) { onUpdate({ entries: [] }); return; }
    const dateRange = generateDateRange(new Date(timesheetData.startDate), new Date(timesheetData.endDate));
    const savedDataMap = new Map(originalData?.entries?.map(entry => [entry.employeeId, entry.days]) || []);
    const newEntries = selectedEmployeeObjects.map((emp) => {
      const existingDays = savedDataMap.get(emp.id);
      const days = dateRange.reduce((acc, date) => {
        const dateKey = formatDateLocal(date);
        acc[dateKey] = existingDays?.[dateKey] || { timeInterval: '', startTime: '', endTime: '', hours: 0, status: 'alege' as DayStatus, notes: '' };
        return acc;
      }, {} as Record<string, any>);
      return { employeeId: emp.id, employeeName: emp.full_name, position: emp.position || 'Staff', days };
    });
    onUpdate({ entries: newEntries });
  };

  const handleEmployeeAdded = (newEmployee: any) => {
    const dateRange = generateDateRange(new Date(timesheetData.startDate), new Date(timesheetData.endDate));
    
    const newEntry = {
      employeeId: newEmployee.id,
      employeeName: newEmployee.full_name,
      position: newEmployee.position || 'Staff',
      days: dateRange.reduce((acc, date) => {
        const dateKey = formatDateLocal(date);
        acc[dateKey] = { timeInterval: '', startTime: '', endTime: '', hours: 0, status: 'alege' as DayStatus, notes: '' };
        return acc;
      }, {} as Record<string, any>),
    };

    onUpdate({ entries: [...timesheetData.entries, newEntry] });
    refetchEmployees();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {existingTimesheetId ? 'Editare Pontaj' : 'Creare Pontaj Nou'}
        </h3>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Înapoi la Listă
        </Button>
      </div>

      <PeriodAndStoreSelector
        timesheetData={timesheetData}
        stores={stores}
        onUpdate={onUpdate}
        isSaving={isSaving}
        isLoadingStores={loadingStores}
        isStoreManager={profile?.role === 'STORE_MANAGER' && stores.length === 1}
      />
      
      <EmployeeSelectionPanel
        storeId={timesheetData.storeId}
        selectedEmployeeIds={selectedEmployeeIds}
        employees={allAvailableEmployees}
        regularEmployees={regularEmployees}
        delegatedEmployees={delegatedEmployees}
        historicalEmployees={historicalEmployees}
        isLoading={loadingEmployees}
        isSaving={isSaving}
        hasStoreSelected={hasStoreSelected}
        existingTimesheetId={existingTimesheetId}
        onSelectionChange={handleEmployeeSelection}
        onEmployeeAdded={handleEmployeeAdded}
      />
      
      <EmployeeDelegationPanel
        employees={employees}
        selectedEmployeeIds={selectedEmployeeIds}
        regularEmployees={regularEmployees}
        delegatedEmployees={delegatedEmployees}
        onDelegationChange={handleDelegationChange} 
      />
      
      
      <DelegationInfoPanel delegatedEmployees={delegatedEmployees} />
    </div>
  );
}