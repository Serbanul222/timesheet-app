// components/timesheets/TimesheetListView.tsx
'use client'
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { formatHours } from '@/lib/utils';
import { formatDateEuropean, getPeriodDisplay, formatMonthYearRomanian } from '@/lib/utils/dateFormatting';
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

console.log('DEBUG: Romanian month test:', formatMonthYearRomanian(new Date()));
console.log('DEBUG: Component loaded with Romanian formatting');

interface TimesheetListViewProps {
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

  if (isLoading) return <div className="p-8 text-center">Încărcare pontaje...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Eroare la încărcarea pontajelor: {error.message}</div>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pontaje salvate</h2>
          <p className="text-gray-600 mt-1">Selectați o grilă pentru a vizualiza sau edita, sau creați una nouă.</p>
        </div>
        <Button onClick={onCreateNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Creează pontaj nou
        </Button>
      </div>
      <div className="divide-y divide-gray-200">
        {grids.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <h3 className="text-lg font-medium">Nu au fost găsite grile de pontaj.</h3>
            <p className="mt-2">Începeți prin a crea un nou pontaj.</p>
          </div>
        ) : (
          grids.map(grid => (
            <div key={grid.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {grid.grid_title && !grid.grid_title.includes('employees') ? grid.grid_title : `${formatMonthYearRomanian(grid.period_start)} - ${grid.employee_count || 1} angajat${(grid.employee_count && grid.employee_count !== 1) ? 'i' : ''}`}
                </p>
                <div className="text-sm text-gray-500 mt-1">
                  <span>{grid.store?.name || 'Magazin necunoscut'}</span>
                  <span className="mx-2">•</span>
                  <span>{getPeriodDisplay(grid.period_start, grid.period_end)}</span>
                </div>
                {grid.employee_count && (
                  <div className="text-xs text-gray-400 mt-1">
                    {grid.employee_count} angajat{grid.employee_count !== 1 ? 'i' : ''}
                  </div>
                )}
              </div>
              <div className="text-right ml-4">
                <p className="text-lg font-bold text-blue-600">{formatHours(grid.total_hours)}</p>
                <p className="text-xs text-gray-400 mb-2">
                  Creat: {formatDateEuropean(grid.created_at)}
                </p>
                <Button variant="outline" size="sm" onClick={() => onEditTimesheet(grid)}>
                  Editează
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}