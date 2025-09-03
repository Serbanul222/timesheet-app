// FILE: components/timesheets/TimesheetControls.tsx - FINAL VERSION WITH REFINED LOGIC
'use client'

import { useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { useEmployees } from '@/hooks/data/useEmployees'
import { useStores } from '@/hooks/data/useStores'
import { useEmployeeDeletion } from '@/hooks/timesheet/useEmployeeDeletion'
import { type TimesheetGridData, type DayStatus, type TimesheetEntry } from '@/types/timesheet-grid'
import { generateDateRange, formatDateLocal } from '@/lib/timesheet-utils'
import { PeriodAndStoreSelector } from './PeriodAndStoreSelector'
import { EmployeeSelectionPanel } from './EmployeeSelectionPanel'
import { EmployeeDelegationPanel } from './EmployeeDelegationPanel'
import { DelegationInfoPanel } from './DelegationInfoPanel'
import { Button } from '@/components/ui/Button'

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

interface TimesheetControlsProps {
  timesheetData: TimesheetGridData;
  onUpdate: (data: Partial<TimesheetGridData>) => void;
  isSaving: boolean;
  existingTimesheetId?: string;
  originalData: TimesheetGridData | null;
  onCancel: () => void;
  readOnly?: boolean;
}

export function TimesheetControls({
  timesheetData,
  onUpdate,
  isSaving,
  existingTimesheetId,
  originalData,
  onCancel,
  readOnly = false,
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
    // [LOGICA CHEIE 1] Cerem hook-ului să includă inactivii,
    // astfel încât să avem control total asupra filtrării mai jos.
    includeInactive: !!existingTimesheetId, 
  });

  const { deleteEmployee, deleteBulkEmployees } = useEmployeeDeletion({
    data: timesheetData,
    onDataChange: onUpdate,
    readOnly
  });

  // Handler robust pentru ștergerea unui singur angajat
  const handleEmployeeDelete = useCallback(async (employeeId: string) => {
    await deleteEmployee(employeeId);
    await delay(400); 
    await refetchEmployees();
  }, [deleteEmployee, refetchEmployees]);

  // Handler robust pentru ștergerea în masă
  const handleBulkEmployeeDelete = useCallback(async (employeeIds: string[]) => {
    await deleteBulkEmployees(employeeIds);
    await delay(400);
    await refetchEmployees();
  }, [deleteBulkEmployees, refetchEmployees]);

  // Toate ID-urile angajaților prezenți în grila de jos
  const selectedIdsFromGrid = useMemo(() => 
    timesheetData.entries.map((entry) => entry.employeeId),
    [timesheetData.entries]
  );

  // [LOGICA CHEIE 2] Creăm o listă de angajați care sunt afișați în panoul de selecție.
  // Aceasta exclude angajații deja inactivi din lista completă.
  const activeEmployeesForSelection = useMemo(() => {
    const allEmps = new Map<string, any>();
    // Construim o listă unică din toate sursele
    employees.forEach(emp => allEmps.set(emp.id, emp));
    historicalEmployees.forEach(emp => allEmps.set(emp.id, emp));
    
    // Filtrăm pentru a păstra DOAR angajații activi
    return Array.from(allEmps.values()).filter(emp => emp.is_active);
  }, [employees, historicalEmployees]);

  // [LOGICA CHEIE 3] Creăm o listă de ID-uri care sunt selectate ÎN PREZENT în grilă
  // ȘI care sunt încă active. Aceasta va controla butonul de dezactivare în masă.
  const activeSelectedIds = useMemo(() => 
    selectedIdsFromGrid.filter(id => 
      // Verificăm dacă ID-ul selectat există în lista noastră de angajați activi
      activeEmployeesForSelection.some(emp => emp.id === id)
    ),
    [selectedIdsFromGrid, activeEmployeesForSelection]
  );
  
  // Handler-ul pentru selecție (când utilizatorul bifează/debifează în EmployeeSelector)
  // rămâne neschimbat. El controlează ce este în grila de jos.
  const handleEmployeeSelection = (newlySelectedIds: string[]) => {
    // Luăm în considerare toți angajații disponibili (activi și inactivi) pentru a reconstrui corect grila
    const allAvailableEmployees = new Map<string, any>();
    employees.forEach(emp => allAvailableEmployees.set(emp.id, emp));
    historicalEmployees.forEach(emp => allAvailableEmployees.set(emp.id, emp));
    
    const selectedEmployeeObjects = newlySelectedIds
      .map(id => allAvailableEmployees.get(id))
      .filter(Boolean); // Eliminăm orice posibil ID invalid

    if (selectedEmployeeObjects.length === 0) { 
      onUpdate({ entries: [] }); 
      return; 
    }

    const dateRange = generateDateRange(
      new Date(timesheetData.startDate), 
      new Date(timesheetData.endDate)
    );

    const savedDataMap = new Map(
      originalData?.entries?.map(entry => [entry.employeeId, entry.days]) || []
    );
    
    const currentDataMap = new Map(
      timesheetData.entries.map(entry => [entry.employeeId, entry.days])
    );

    const newEntries = selectedEmployeeObjects.map((emp) => {
      const currentDays = currentDataMap.get(emp.id);
      const savedDays = savedDataMap.get(emp.id);
      
      const days = dateRange.reduce((acc, date) => {
        const dateKey = formatDateLocal(date);
        acc[dateKey] = currentDays?.[dateKey] || savedDays?.[dateKey] || { timeInterval: '', startTime: '', endTime: '', hours: 0, status: 'alege' as DayStatus, notes: '' };
        return acc;
      }, {} as Record<string, any>);

      return { 
        employeeId: emp.id, 
        employeeName: emp.full_name, 
        position: emp.position || 'Staff', 
        days 
      };
    });

    onUpdate({ entries: newEntries });
  };

  const handleEmployeeAdded = (newEmployee: any) => {
    const dateRange = generateDateRange(
      new Date(timesheetData.startDate), 
      new Date(timesheetData.endDate)
    );
    
    const newEntry: TimesheetEntry = {
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
  
  const handleDelegationChange = () => {
    refetchEmployees();
  };

  useEffect(() => {
    const isStoreManager = profile?.role === 'STORE_MANAGER';
    if (isStoreManager && profile.store_id && stores.length === 1 && timesheetData.storeId !== profile.store_id) {
      onUpdate({ storeId: profile.store_id, entries: [] });
    }
  }, [profile, stores, timesheetData.storeId, onUpdate]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {existingTimesheetId ? 'Editare Pontaj' : 'Creare Pontaj Nou'}
        </h3>
        <Button variant="outline" size="sm" onClick={onCancel}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
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
        isEditing={!!existingTimesheetId}
      />
      
      <EmployeeSelectionPanel
        storeId={timesheetData.storeId}
        selectedEmployeeIds={selectedIdsFromGrid} 
        employees={activeEmployeesForSelection} 
        activeSelectedIdsForBulkDelete={activeSelectedIds}
        regularEmployees={regularEmployees.filter(e => (e as any).is_active)}
        delegatedEmployees={delegatedEmployees.filter(e => (e as any).is_active)}
        historicalEmployees={historicalEmployees.filter(e => (e as any).is_active)}
        isLoading={loadingEmployees}
        isSaving={isSaving}
        hasStoreSelected={hasStoreSelected}
        existingTimesheetId={existingTimesheetId}
        showDelete={!readOnly}
        readOnly={readOnly}
        onSelectionChange={handleEmployeeSelection}
        onEmployeeAdded={handleEmployeeAdded}
        onEmployeeDelete={handleEmployeeDelete}
        onEmployeeBulkDelete={handleBulkEmployeeDelete} 
      />
      
      <EmployeeDelegationPanel
        employees={employees}
        selectedEmployeeIds={selectedIdsFromGrid}
        regularEmployees={regularEmployees}
        delegatedEmployees={delegatedEmployees}
        onDelegationChange={handleDelegationChange} 
      />
      
      <DelegationInfoPanel delegatedEmployees={delegatedEmployees} />
    </div>
  );
}