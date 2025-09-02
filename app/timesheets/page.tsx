// FILE: app/timesheets/page.tsx - FINAL AND CORRECTED
'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
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

/**
 * This inner component contains all the page logic and is wrapped in a Suspense
 * boundary because it uses the useSearchParams() hook.
 */
function TimesheetsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient();

  // PRESERVED: All your state declarations are unchanged.
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isLoading, setIsLoading] = useState(true)
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null)
  const [gridData, setGridData] = useState<TimesheetGridData | null>(null)
  const [originalData, setOriginalData] = useState<TimesheetGridData | null>(null)

  // PRESERVED: Your data loading function is unchanged.
  const loadTimesheetForEditing = useCallback(async (timesheetId: string) => {
    console.log('🔍 Page: loadTimesheetForEditing called with ID:', timesheetId);
    setIsLoading(true)
    try {
      const loadedGridData = await TimesheetDataLoader.loadTimesheetForEdit({ timesheetId, includeHistoricalEmployees: true });
      if (!loadedGridData) {
        toast.error('Pontajul nu a fost găsit'); setViewMode('list'); return;
      }
      const validation = TimesheetDataLoader.validateGridData(loadedGridData);
      if (!validation.isValid) {
        toast.error('Eroare la încărcarea datelor pontajului', { description: validation.errors.join(', ') }); setViewMode('list'); return;
      }
      if (validation.warnings.length > 0) {
        toast.warning('Datele au fost încărcate cu avertismente', { description: validation.warnings.join(', ') });
      }
      console.log('✅ Page: Timesheet loaded successfully for editing');
      setGridData(loadedGridData);
      setOriginalData(loadedGridData);
      setViewMode('grid');
      toast.success('Pontaj pregătit pentru editare');
    } catch (error) {
      console.error('❌ Page: Failed to load timesheet for editing:', error);
      toast.error('Eroare la încărcarea pontajului', { description: error instanceof Error ? error.message : 'Unknown error' });
      setViewMode('list');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // PRESERVED: Your useEffect for managing state from the URL is unchanged.
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && editId !== editingTimesheetId) {
      setEditingTimesheetId(editId);
      loadTimesheetForEditing(editId);
    } else if (!editId && editingTimesheetId) {
        setEditingTimesheetId(null);
        setGridData(null);
        setOriginalData(null);
        if (viewMode === 'grid') setViewMode('list');
    }
     else {
      setIsLoading(false);
    }
  }, [searchParams, editingTimesheetId, loadTimesheetForEditing, viewMode]);

  // PRESERVED: Your handler for creating a new timesheet is unchanged.
  const handleCreateNew = () => {
    router.push('/timesheets');
    const defaultData = generateDefaultTimesheetData();
    setEditingTimesheetId(null);
    setGridData(defaultData);
    setOriginalData(defaultData);
    setViewMode('grid');
  };

  // PRESERVED: Your handler for editing a timesheet from the list is unchanged.
  const handleEditTimesheet = async (timesheet: TimesheetGridRecord) => {
    router.push(`/timesheets?edit=${timesheet.id}`);
  };

  // PRESERVED: Your handler for editing from the modal is unchanged.
  const handleEditExistingTimesheet = useCallback(async (timesheetId: string) => {
    console.log('🔍 Page: handleEditExistingTimesheet called with ID:', timesheetId);
    try {
      router.push(`/timesheets?edit=${timesheetId}`);
      console.log('✅ Page: Redirecting to edit existing timesheet');
    } catch (error) {
      console.error('❌ Page: Failed to redirect to edit existing timesheet:', error);
      toast.error('Eroare la redicționare pentru editare pontaj');
    }
  }, [router]);

  // PRESERVED: Your handler for grid data changes is unchanged.
  const handleGridDataChange = (updates: Partial<TimesheetGridData>) => {
    setGridData(prevData => {
      const baseData = prevData || generateDefaultTimesheetData();
      return { ...baseData, ...updates };
    });
  };

  // ✅ THIS IS THE FIX ✅
  // A new helper function to handle all "return to list" scenarios.
  const returnToList = () => {
    // We check if we were in "edit mode" by looking at `editingTimesheetId`.
    if (editingTimesheetId) {
      // If we were editing, changing the URL is enough. The useEffect will handle the state cleanup.
      router.push('/timesheets');
    } else {
      // If we were in "create mode", the URL is already correct.
      // We MUST manually set the state to return to the list view.
      setViewMode('list');
      setGridData(null);
      setOriginalData(null);
      setEditingTimesheetId(null);
    }
  };

  // The handleCancel function now uses the new helper.
  const handleCancel = () => {
    returnToList();
  };

  // The handleSaveSuccess function now ALSO uses the new helper.
  const handleSaveSuccess = () => {
    toast.success('Pontaj salvat cu succes!');
    queryClient.invalidateQueries({ queryKey: ['timesheet_grids'] });
    returnToList();
  };

  // PRESERVED: Your entire JSX return block is unchanged.
  return (
    <>
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs break-all">
          <strong>Debug:</strong> Mode: {viewMode} | Editing: {editingTimesheetId || 'none'} | StoreID: {gridData?.storeId || 'none'} | Entries: {gridData?.entries.length || 0}
        </div>
      )}
      {viewMode === 'list' && (<TimesheetListView onEditTimesheet={handleEditTimesheet} onCreateNew={handleCreateNew} />)}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          <TimesheetControls
            timesheetData={gridData || generateDefaultTimesheetData()}
            onUpdate={handleGridDataChange}
            isSaving={false}
            existingTimesheetId={editingTimesheetId || undefined}
            originalData={originalData}
            onCancel={handleCancel} // This now calls the correct logic
          />
          {gridData && gridData.storeId ? (
            <TimesheetGrid
              data={gridData}
              onDataChange={handleGridDataChange}
              onCancel={handleCancel} // This also calls the correct logic
              onSaveSuccess={handleSaveSuccess} // This now calls the correct logic
              onEditExistingTimesheet={handleEditExistingTimesheet}
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
    </>
  );
}

/**
 * This is the main page export. It wraps the dynamic content in a Suspense
 * boundary to prevent build errors related to useSearchParams.
 */
export default function TimesheetsPage() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm-px-6 lg-px-8 py-8">
        <Suspense fallback={<div className="text-center py-20">Încărcare pagină...</div>}>
          <TimesheetsPageContent />
        </Suspense>
      </div>
    </MainLayout>
  );
}