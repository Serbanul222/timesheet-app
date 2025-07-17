// app/timesheets/page.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Header } from '@/components/layout/Header'
import { TimesheetGrid } from '@/components/timesheets/TimesheetGrid'
import { TimesheetControls } from '@/components/timesheets/TimesheetControls'
import { TimesheetListView, TimesheetGridRecord } from '@/components/timesheets/TimesheetListView'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { type TimesheetGridData } from '@/types/timesheet-grid'
import { getDefaultPeriod, generateDateRange } from '@/lib/timesheet-utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'

interface TimesheetWithDetails {
  id: string;
  store_id: string;
  zone_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  created_at: string;
  updated_at: string;
  daily_entries?: any;
  grid_title?: string;
  store?: {
    id: string;
    name: string;
  };
}

type ViewMode = 'list' | 'create' | 'edit';

export default function TimesheetsPage() {
  const permissions = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlStoreId = searchParams.get('storeId');
  const urlStoreName = searchParams.get('storeName');
  const urlEmployeeId = searchParams.get('employeeId');
  const urlEmployeeName = searchParams.get('employeeName');

  const [viewMode, setViewMode] = useState<ViewMode>(
    (urlStoreId || urlEmployeeId) ? 'list' : 'create'
  );
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetWithDetails | null>(null);

  const defaultPeriod = getDefaultPeriod();
  const [timesheetData, setTimesheetData] = useState<TimesheetGridData>({
    id: crypto.randomUUID(),
    startDate: defaultPeriod.startDate.toISOString(),
    endDate: defaultPeriod.endDate.toISOString(),
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    storeId: urlStoreId || undefined,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (urlStoreId && urlStoreName) {
      toast.info(`Viewing timesheets for: ${urlStoreName}`, {
        description: 'Click on any timesheet to edit, or create a new one.',
        duration: 5000,
      });
    } else if (urlEmployeeId && urlEmployeeName) {
      toast.info(`Viewing timesheets for: ${urlEmployeeName}`, {
        description: 'Click on any timesheet to edit, or create a new one.',
        duration: 5000,
      });
    }
    if (urlStoreId || urlEmployeeId) {
      router.replace('/timesheets', { scroll: false });
    }
  }, [urlStoreId, urlStoreName, urlEmployeeId, urlEmployeeName, router]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      console.log('Saving timesheet:', timesheetData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (editingTimesheet) {
        toast.success('Timesheet updated successfully');
      } else {
        toast.success('Timesheet created successfully');
      }
      setViewMode('list');
      setEditingTimesheet(null);
    } catch (error) {
      console.error('Failed to save timesheet:', error);
      toast.error('Failed to save timesheet');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [timesheetData, editingTimesheet]);

  /**
   * ✅ CORRECTED: This function now intelligently merges employee lists.
   * When adding a new employee, it preserves the data of existing employees
   * instead of overwriting them.
   */
  const handleTimesheetUpdate = useCallback((newData: Partial<TimesheetGridData>) => {
    setTimesheetData(prev => {
      if (!prev) return newData as TimesheetGridData;

      if (newData.entries) {
        const prevEntriesMap = new Map(prev.entries.map(e => [e.employeeId, e]));
        const finalEntries = newData.entries.map(newEntry => {
          return prevEntriesMap.get(newEntry.employeeId) || newEntry;
        });
        return { ...prev, ...newData, entries: finalEntries, updatedAt: new Date().toISOString() };
      }
      return { ...prev, ...newData, updatedAt: new Date().toISOString() };
    });
  }, []);

  const handleGridDataChange = useCallback((newData: TimesheetGridData) => {
    setTimesheetData(newData);
  }, []);

  const handleEditTimesheet = useCallback((timesheet: TimesheetGridRecord) => {
    if (!timesheet.daily_entries || typeof timesheet.daily_entries !== 'object') {
      toast.error("Failed to load timesheet data. The record appears to be corrupt.");
      return;
    }

    const entries = Object.entries(timesheet.daily_entries).map(([employeeId, employeeData]: [string, any]) => {
      const days: { [date: string]: any } = {};
      const dateRange = generateDateRange(new Date(timesheet.period_start), new Date(timesheet.period_end));
      
      dateRange.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        const dayEntry = employeeData.days?.[dateKey];
        days[dateKey] = {
          hours: dayEntry?.hours || 0, status: dayEntry?.status || 'alege',
          notes: dayEntry?.notes || '', timeInterval: dayEntry?.timeInterval || '',
        };
      });

      return {
        employeeId, employeeName: employeeData.name, position: employeeData.position, days,
      };
    });

    const gridData: TimesheetGridData = {
      id: timesheet.id, storeId: timesheet.store_id, zoneId: timesheet.zone_id,
      startDate: timesheet.period_start, endDate: timesheet.period_end,
      entries, createdAt: timesheet.created_at, updatedAt: timesheet.updated_at,
    };

    setTimesheetData(gridData);
    setEditingTimesheet(timesheet as TimesheetWithDetails);
    setViewMode('edit');
    toast.info(`Now editing: ${timesheet.grid_title}`);
  }, []);

  const handleCreateNew = useCallback(() => {
    const defaultPeriod = getDefaultPeriod();
    setTimesheetData({
      id: crypto.randomUUID(),
      startDate: defaultPeriod.startDate.toISOString(),
      endDate: defaultPeriod.endDate.toISOString(),
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      storeId: urlStoreId || undefined,
    });
    setEditingTimesheet(null);
    setViewMode('create');
  }, [urlStoreId]);

  const handleCancel = useCallback(() => {
    setViewMode('list');
    setEditingTimesheet(null);
  }, []);

  if (!permissions.canViewTimesheets) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
            <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {viewMode === 'list' ? 'Timesheets' : 
                   viewMode === 'edit' ? 'Edit Timesheet' : 'Create Timesheet'}
                </h1>
                <p className="text-gray-600">
                  {viewMode === 'list' ? 'View and manage timesheet records' :
                   viewMode === 'edit' ? 'Edit existing timesheet data' : 'Create new timesheet records'}
                </p>
              </div>
              {viewMode !== 'list' && (
                <Button variant="outline" onClick={handleCancel}>Back to List</Button>
              )}
            </div>

            {viewMode === 'list' && (
              <TimesheetListView
                storeId={urlStoreId || undefined}
                storeName={urlStoreName || undefined}
                employeeId={urlEmployeeId || undefined}
                employeeName={urlEmployeeName || undefined}
                onEditTimesheet={handleEditTimesheet}
                onCreateNew={handleCreateNew}
              />
            )}

            {(viewMode === 'create' || viewMode === 'edit') && (
              <>
                <TimesheetControls
                  timesheetData={timesheetData}
                  onUpdate={handleTimesheetUpdate}
                  isSaving={isSaving}
                  preSelectedEmployeeId={urlEmployeeId || editingTimesheet?.employee_id}
                />
                <TimesheetGrid
                  data={timesheetData}
                  onDataChange={handleGridDataChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  readOnly={!permissions.canEditTimesheets}
                />
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
