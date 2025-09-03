// FILE: app/timesheets/page.tsx - FINAL AND CLEANED VERSION
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

// Notă: Am eliminat importul și utilizarea 'useEmployeeDeletion' și 'delay' de aici,
// deoarece această logică este acum complet încapsulată în TimesheetControls.tsx.

type ViewMode = 'list' | 'grid' | 'dashboard'

export interface TimesheetGridRecord {
  id: string; store_id: string; zone_id: string; period_start: string; period_end: string;
  total_hours: number; employee_count: number; grid_title: string; created_at: string;
  updated_at: string; daily_entries: any; store?: { name: string };
}

function TimesheetsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isLoading, setIsLoading] = useState(true)
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null)
  const [gridData, setGridData] = useState<TimesheetGridData | null>(null)
  const [originalData, setOriginalData] = useState<TimesheetGridData | null>(null)

  const loadTimesheetForEditing = useCallback(async (timesheetId: string) => {
    setIsLoading(true);
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

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && editId !== editingTimesheetId) {
      setEditingTimesheetId(editId);
      loadTimesheetForEditing(editId);
    } else if (!editId && editingTimesheetId) {
      setEditingTimesheetId(null);
      setGridData(null);
      setOriginalData(null);
      if (viewMode === 'grid') setViewMode('list');
    } else {
      setIsLoading(false);
    }
  }, [searchParams, editingTimesheetId, loadTimesheetForEditing, viewMode]);

  function handleGridDataChange(updates: Partial<TimesheetGridData>) {
    setGridData(prevData => {
      const baseData = prevData || generateDefaultTimesheetData();
      return { ...baseData, ...updates };
    });
  };

  const returnToList = () => {
    if (editingTimesheetId) {
      router.push('/timesheets');
    } else {
      setViewMode('list');
      setGridData(null);
      setOriginalData(null);
      setEditingTimesheetId(null);
    }
  };

  const handleCancel = () => returnToList();
  const handleSaveSuccess = () => {
    toast.success('Pontaj salvat cu succes!');
    queryClient.invalidateQueries({ queryKey: ['timesheet_grids'] });
    returnToList();
  };
  const handleCreateNew = () => {
    router.push('/timesheets');
    const defaultData = generateDefaultTimesheetData();
    setEditingTimesheetId(null);
    setGridData(defaultData);
    setOriginalData(defaultData);
    setViewMode('grid');
  };
  const handleEditTimesheet = (timesheet: TimesheetGridRecord) => {
    router.push(`/timesheets?edit=${timesheet.id}`);
  };
  const handleEditExistingTimesheet = useCallback((timesheetId: string) => {
    router.push(`/timesheets?edit=${timesheetId}`);
  }, [router]);

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
            onCancel={handleCancel}
            // Notă: Nu mai pasăm props-uri de ștergere, deoarece 'TimesheetControls'
            // își gestionează propria logică intern.
          />
          {gridData && gridData.storeId ? (
            <TimesheetGrid
              data={gridData}
              onDataChange={handleGridDataChange}
              onCancel={handleCancel}
              onSaveSuccess={handleSaveSuccess}
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