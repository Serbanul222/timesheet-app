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
//import { TimesheetSummaryPanel } from './TimesheetSummaryPanel'

interface TimesheetControlsProps {
  timesheetData: TimesheetGridData;
  onUpdate: (data: Partial<TimesheetGridData>) => void;
  isSaving: boolean;
  existingTimesheetId?: string;
  originalData: TimesheetGridData | null;
}

export function TimesheetControls({
  timesheetData,
  onUpdate,
  isSaving,
  existingTimesheetId,
  originalData,
}: TimesheetControlsProps) {
  const { profile } = useAuth()
  const { stores, loadingStores } = useStores()

  const {
    employees,
    regularEmployees,
    delegatedEmployees,
    historicalEmployees,
    isLoading: loadingEmployees,
    refetch: refetchEmployees, // ✅ Get the 'refetch' function from the hook
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

  const handleEmployeeSelection = (newlySelectedIds: string[]) => {
    const selectedEmployeeObjects = allAvailableEmployees.filter((emp) => newlySelectedIds.includes(emp.id));
    if (selectedEmployeeObjects.length === 0) {
      onUpdate({ entries: [] });
      return;
    }
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
      employeeId: newEmployee.id, employeeName: newEmployee.full_name, position: newEmployee.position || 'Staff',
      days: dateRange.reduce((acc, date) => {
        const dateKey = formatDateLocal(date);
        acc[dateKey] = { timeInterval: '', startTime: '', endTime: '', hours: 0, status: 'alege' as DayStatus, notes: '' };
        return acc;
      }, {} as Record<string, any>),
    };
    onUpdate({ entries: [...timesheetData.entries, newEntry] });
    refetchEmployees();
  };

  /**
   * ✅ This new handler calls the 'refetch' function. It will be passed down
   * to children components so they can signal that a data refresh is needed.
   */
  const handleDelegationChange = () => {
    console.log('Delegation change detected. Refetching employee list...');
    refetchEmployees();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
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
      
      {/* ✅ Pass the new handler down to the delegation panel */}
      <EmployeeDelegationPanel
        employees={employees}
        selectedEmployeeIds={selectedEmployeeIds}
        regularEmployees={regularEmployees}
        delegatedEmployees={delegatedEmployees}
        onDelegationChange={handleDelegationChange} 
      />
      
      {/* {timesheetData.storeId && (
        <TimesheetSummaryPanel
          selectedEmployeeIds={selectedEmployeeIds}
          selectedStoreId={timesheetData.storeId}
          timesheetData={timesheetData}
          stores={stores}
          regularEmployees={regularEmployees}
          delegatedEmployees={delegatedEmployees}
          historicalEmployees={historicalEmployees}
          employees={employees}
          onSelectAll={() => handleEmployeeSelection(allAvailableEmployees.map((emp) => emp.id))}
          onClearAll={() => handleEmployeeSelection([])}
          isLoadingEmployees={loadingEmployees}
        />
      )}
       */}
      <DelegationInfoPanel delegatedEmployees={delegatedEmployees} />
    </div>
  );
}