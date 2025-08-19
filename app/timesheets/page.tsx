// FILE: app/timesheets/page.tsx - REWRITTEN
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { TimesheetDashboard } from '@/components/timesheets/TimesheetDashboard'
import { TimesheetGrid } from '@/components/timesheets/TimesheetGrid'
import { TimesheetControls } from '@/components/timesheets/TimesheetControls'
import { TimesheetListView } from '@/components/timesheets/TimesheetListView'
import { TimesheetDataLoader } from '@/lib/timesheet-data-loader'
import { MainLayout } from '@/components/layout/MainLayout'
import { type TimesheetGridData } from '@/types/timesheet-grid'
import { generateDefaultTimesheetData } from '@/lib/timesheet-utils'
import { toast } from 'sonner'

type ViewMode = 'list' | 'grid' | 'dashboard'

export interface TimesheetGridRecord {
  id: string;
  store_id: string;
  zone_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  employee_count: number;
  grid_title: string;
  created_at: string;
  updated_at: string;
  daily_entries: any;
  store?: { name: string };
}

export default function TimesheetsPage() {
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isLoading, setIsLoading] = useState(true)
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null)

  // State for the "working copy" of the data that the UI modifies
  const [gridData, setGridData] = useState<TimesheetGridData | null>(null)
  
  // ✅ THE FIX: State for the "long-term memory" - a pristine copy of the originally loaded data
  const [originalData, setOriginalData] = useState<TimesheetGridData | null>(null)

  // --- DATA LOADING & INITIALIZATION ---

  const loadTimesheetForEditing = useCallback(async (timesheetId: string) => {
    setIsLoading(true)
    try {
      const loadedGridData = await TimesheetDataLoader.loadTimesheetForEdit({ timesheetId, includeHistoricalEmployees: true });
      if (!loadedGridData) {
        toast.error('Timesheet not found');
        setViewMode('list');
        return;
      }

      // Perform validation on loaded data
      const validation = TimesheetDataLoader.validateGridData(loadedGridData);
      if (!validation.isValid) {
        toast.error('Failed to load timesheet data', { description: validation.errors.join(', ') });
        setViewMode('list');
        return;
      }
      if (validation.warnings.length > 0) {
        toast.warning('Data loaded with warnings', { description: validation.warnings.join(', ') });
      }

      // ✅ THE FIX: Set BOTH the working copy and the pristine original copy
      setGridData(loadedGridData);
      setOriginalData(loadedGridData); // This is the component's "long-term memory"

      setViewMode('grid');
      toast.success('Timesheet loaded for editing');
    } catch (error) {
      console.error('Failed to load timesheet for editing:', error);
      toast.error('Failed to load timesheet', { description: error instanceof Error ? error.message : 'Unknown error' });
      setViewMode('list');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && editId !== editingTimesheetId) {
      setEditingTimesheetId(editId);
      loadTimesheetForEditing(editId);
    } else {
      setIsLoading(false);
    }
  }, [searchParams, editingTimesheetId, loadTimesheetForEditing]);

  // --- EVENT HANDLERS ---

  const handleCreateNew = () => {
    const defaultData = generateDefaultTimesheetData();
    setEditingTimesheetId(null);
    setGridData(defaultData);
    setOriginalData(defaultData); // Also initialize the "memory" for a new sheet
    setViewMode('grid');
  };

  const handleEditTimesheet = async (timesheet: TimesheetGridRecord) => {
    setEditingTimesheetId(timesheet.id);
    await loadTimesheetForEditing(timesheet.id);
  };

  const handleGridDataChange = (updates: Partial<TimesheetGridData>) => {
    setGridData(prevData => {
      const baseData = prevData || generateDefaultTimesheetData();
      return { ...baseData, ...updates };
    });
  };

  const handleCancel = () => {
    setViewMode('list');
    setGridData(null);
    setOriginalData(null); // Clear the memory when cancelling
    setEditingTimesheetId(null);
  };

  const handleSaveSuccess = () => {
    toast.success('Timesheet saved successfully!');
    setViewMode('list');
    setGridData(null);
    setOriginalData(null); // Clear the memory after saving
    setEditingTimesheetId(null);
  };

  // --- RENDER LOGIC ---

  if (isLoading) {
    return <MainLayout><div className="text-center py-20">Loading...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-gray-100 rounded text-xs break-all">
            <strong>Debug:</strong> Mode: {viewMode} | Editing: {editingTimesheetId || 'none'} | StoreID: {gridData?.storeId || 'none'} | Entries: {gridData?.entries.length || 0}
          </div>
        )}

        {viewMode === 'list' && (
          <TimesheetListView 
            onEditTimesheet={handleEditTimesheet}
            onCreateNew={handleCreateNew}
          />
        )}

        {viewMode === 'grid' && (
          <div className="space-y-6">
            <TimesheetControls
              timesheetData={gridData || generateDefaultTimesheetData()}
              onUpdate={handleGridDataChange}
              isSaving={false}
              existingTimesheetId={editingTimesheetId || undefined}
              // ✅ THE FIX: Pass the "long-term memory" down to the controls
              originalData={originalData}
            />
            
            {gridData && gridData.storeId ? (
              <TimesheetGrid
                data={gridData}
                onDataChange={handleGridDataChange}
                onCancel={handleCancel}
                onSaveSuccess={handleSaveSuccess}
                readOnly={false}
              />
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900">Configurări necesare</h3>
                <p className="text-sm text-gray-600 mt-1">Vă rugăm să selectați un magazin pentru a continua.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}