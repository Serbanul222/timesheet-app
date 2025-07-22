// app/timesheets/page.tsx - FIXED: Remove duplicate header, use MainLayout
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/MainLayout'  // ✅ Use MainLayout instead
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

    // ✅ ENHANCED: Better parsing of timesheet data formats with interval restoration
    const entries = parseTimesheetEntries(timesheet);

    const gridData: TimesheetGridData = {
      id: timesheet.id, 
      storeId: timesheet.store_id, 
      zoneId: timesheet.zone_id,
      startDate: timesheet.period_start, 
      endDate: timesheet.period_end,
      entries, 
      createdAt: timesheet.created_at, 
      updatedAt: timesheet.updated_at,
    };

    setTimesheetData(gridData);
    setEditingTimesheet(timesheet as TimesheetWithDetails);
    setViewMode('edit');
    toast.info(`Now editing: ${timesheet.grid_title || 'Timesheet'}`);
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
      <MainLayout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 text-center">
          <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
          <p className="text-gray-600 mt-2">You do not have permission to view this page.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>  {/* ✅ FIXED: Use MainLayout instead of ProtectedRoute + Header */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
                existingTimesheetId={editingTimesheet?.id}
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
      </div>
    </MainLayout>
  );
}

// ✅ FIXED: Enhanced timesheet entry parsing that PRESERVES time intervals
function parseTimesheetEntries(timesheet: TimesheetGridRecord): any[] {
  const dailyEntries = timesheet.daily_entries;
  if (!dailyEntries || typeof dailyEntries !== 'object') {
    return [];
  }

  try {
    const dateRange = generateDateRange(
      new Date(timesheet.period_start), 
      new Date(timesheet.period_end)
    );

    // Handle new format: { _employees: {...}, [date]: {...} }
    if (dailyEntries._employees) {
      console.log('📋 Parsing new format timesheet with _employees metadata');
      
      return Object.entries(dailyEntries._employees).map(([employeeId, employeeData]: [string, any]) => {
        const days: { [date: string]: any } = {};
        
        dateRange.forEach(date => {
          const dateKey = date.toISOString().split('T')[0];
          const dayEntry = dailyEntries[dateKey]?.[employeeId];
          
          days[dateKey] = {
            // ✅ FIXED: Restore ALL time-related fields including timeInterval
            timeInterval: dayEntry?.timeInterval || '',  // ✅ RESTORE: Original interval string
            startTime: dayEntry?.startTime || '',        // ✅ RESTORE: Start time  
            endTime: dayEntry?.endTime || '',            // ✅ RESTORE: End time
            hours: dayEntry?.hours || 0,                 // ✅ RESTORE: Calculated hours
            status: dayEntry?.status || 'alege',         // ✅ RESTORE: Status
            notes: dayEntry?.notes || '',                // ✅ RESTORE: Notes
          };
        });

        return {
          employeeId,
          employeeName: employeeData.name,
          position: employeeData.position || 'Staff',
          days,
        };
      });
    }
    
    // Handle alternative format: { [employeeId]: { name, days: {...} } }
    else {
      console.log('📋 Parsing alternative format timesheet');
      
      return Object.entries(dailyEntries)
        .filter(([key, value]) => 
          !key.startsWith('_') && // Skip metadata
          typeof value === 'object' && 
          value.name // Has employee name
        )
        .map(([employeeId, employeeData]: [string, any]) => {
          const days: { [date: string]: any } = {};
          
          dateRange.forEach(date => {
            const dateKey = date.toISOString().split('T')[0];
            const dayEntry = employeeData.days?.[dateKey];
            
            days[dateKey] = {
              // ✅ FIXED: Restore ALL time-related fields including timeInterval
              timeInterval: dayEntry?.timeInterval || '',  // ✅ RESTORE: Original interval string
              startTime: dayEntry?.startTime || '',        // ✅ RESTORE: Start time
              endTime: dayEntry?.endTime || '',            // ✅ RESTORE: End time  
              hours: dayEntry?.hours || 0,                 // ✅ RESTORE: Calculated hours
              status: dayEntry?.status || 'alege',         // ✅ RESTORE: Status
              notes: dayEntry?.notes || '',                // ✅ RESTORE: Notes
            };
          });

          return {
            employeeId,
            employeeName: employeeData.name,
            position: employeeData.position || 'Staff',
            days,
          };
        });
    }
  } catch (error) {
    console.error('❌ Error parsing timesheet entries:', error);
    toast.error('Failed to parse timesheet data. The format may be incompatible.');
    return [];
  }
}