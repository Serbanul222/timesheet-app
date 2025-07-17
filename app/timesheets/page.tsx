// app/timesheets/page.tsx
'use client'

import { useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { TimesheetGrid } from '@/components/timesheets/TimesheetGrid';
import { TimesheetListView, TimesheetGridRecord } from '@/components/timesheets/TimesheetListView';
import { type TimesheetGridData } from '@/types/timesheet-grid';
import { generateDateRange } from '@/lib/timesheet-utils';

type ViewMode = 'list' | 'edit';

export default function TimesheetsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeGridData, setActiveGridData] = useState<TimesheetGridData | null>(null);

  /**
   * CORRECTED: This function now correctly parses the employee-centric JSON
   * from the database to reconstruct the state for the TimesheetGrid component.
   */
  const handleEdit = useCallback((gridRecord: TimesheetGridRecord) => {
    // Check if daily_entries exists and is an object
    if (!gridRecord.daily_entries || typeof gridRecord.daily_entries !== 'object') {
      console.error("Cannot edit grid: daily_entries is missing or not an object.", gridRecord);
      // Optionally, show a user-friendly error message here
      return;
    }

    const entries = Object.entries(gridRecord.daily_entries).map(([employeeId, employeeData]: [string, any]) => {
      const days: { [date: string]: any } = {};
      const dateRange = generateDateRange(new Date(gridRecord.period_start), new Date(gridRecord.period_end));
      
      dateRange.forEach(date => {
        const dateKey = date.toISOString().split('T')[0];
        // Safely access the day entry from the employee's data
        const dayEntry = employeeData.days?.[dateKey];
        
        days[dateKey] = {
          hours: dayEntry?.hours || 0,
          status: dayEntry?.status || 'alege',
          notes: dayEntry?.notes || '',
          timeInterval: dayEntry?.timeInterval || '',
        };
      });

      return {
        employeeId,
        employeeName: employeeData.name,
        position: employeeData.position,
        days,
      };
    });

    const gridData: TimesheetGridData = {
      id: gridRecord.id,
      storeId: gridRecord.store_id,
      zoneId: gridRecord.zone_id,
      startDate: gridRecord.period_start,
      endDate: gridRecord.period_end,
      entries,
      createdAt: gridRecord.created_at,
      updatedAt: gridRecord.updated_at,
    };

    setActiveGridData(gridData);
    setViewMode('edit');
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveGridData(null);
    setViewMode('list');
  }, []);
  
  const handleCreateNew = useCallback(() => {
    // This function will clear any existing data and switch to the edit view with a blank slate
    // The TimesheetCreator component will handle the setup of a new grid
    setActiveGridData(null); 
    setViewMode('edit');
  }, []);


  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {viewMode === 'list' && <TimesheetListView onEdit={handleEdit} onCreateNew={handleCreateNew} />}
          
          {viewMode === 'edit' && (
             <TimesheetGrid
              // If activeGridData exists, we are editing. If not, it's a new grid.
              data={activeGridData} 
              onDataChange={setActiveGridData}
              onCancel={handleBackToList}
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
