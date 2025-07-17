// components/timesheets/TimesheetListView.tsx
'use client'

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { formatDate, formatHours } from '@/lib/utils';
import { Json } from '@/types/database';

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
  daily_entries: any; // The full JSONB object
  store?: { name: string };
}

interface TimesheetListViewProps {
  onEdit: (grid: TimesheetGridRecord) => void;
}

export function TimesheetListView({ onEdit }: TimesheetListViewProps) {
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

  if (isLoading) return <div>Loading timesheets...</div>;
  if (error) return <div>Error loading timesheets: {error.message}</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Saved Timesheets</h2>
        <p className="text-gray-600 mt-1">Select a grid to view or edit.</p>
      </div>
      <div className="divide-y divide-gray-200">
        {grids.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No timesheet grids found.</div>
        ) : (
          grids.map(grid => (
            <div key={grid.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="font-semibold text-gray-900">{grid.grid_title}</p>
                <p className="text-sm text-gray-500">
                  {grid.store?.name} • {formatDate(grid.period_start)} - {formatDate(grid.period_end)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">{formatHours(grid.total_hours)}</p>
                <Button variant="outline" size="sm" onClick={() => onEdit(grid)}>
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