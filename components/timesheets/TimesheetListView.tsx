// components/timesheets/TimesheetListView.tsx
'use client'

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { formatDate, formatHours } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';

// This interface needs to match the one in your page.tsx
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
  // Add other fields from your original type if necessary
}

interface TimesheetListViewProps {
  // ✅ CORRECTED: Changed prop name to match the parent component
  onEditTimesheet: (grid: TimesheetGridRecord) => void;
  onCreateNew: () => void;
}

export function TimesheetListView({ onEditTimesheet, onCreateNew }: TimesheetListViewProps) {
  const { data: grids = [], isLoading, error } = useQuery({
    queryKey: ['timesheet_grids'],
    queryFn: async (): Promise<TimesheetGridRecord[]> => {
      const { data, error } = await supabase
        .from('timesheets')
        .select(`*, store:stores(name)`)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading timesheets...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error loading timesheets: {error.message}</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Saved Timesheets</h2>
          <p className="text-gray-600 mt-1">Select a grid to view or edit, or create a new one.</p>
        </div>
        <Button onClick={onCreateNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>
      <div className="divide-y divide-gray-200">
        {grids.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <h3 className="text-lg font-medium">No timesheet grids found.</h3>
            <p className="mt-2">Get started by creating a new timesheet.</p>
          </div>
        ) : (
          grids.map(grid => (
            <div key={grid.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-semibold text-gray-900">{grid.grid_title || `Timesheet for ${formatDate(grid.period_start)}`}</p>
                <p className="text-sm text-gray-500">
                  {grid.store?.name || 'Unknown Store'} • {formatDate(grid.period_start)} - {formatDate(grid.period_end)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">{formatHours(grid.total_hours)}</p>
                {/* ✅ CORRECTED: Using the correct prop name here */}
                <Button variant="outline" size="sm" onClick={() => onEditTimesheet(grid)}>
                  Edit
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
