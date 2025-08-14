// components/timesheets/visualization/TimesheetOverview.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, Clock, Users, BarChart } from 'lucide-react'
import { format, subDays } from 'date-fns'

interface OverviewCardProps {
  title: string
  value: string
  change?: number
  icon: React.ElementType
}

const OverviewCard = ({ title, value, change, icon: Icon }: OverviewCardProps) => {
  const isPositive = change !== undefined && change >= 0;
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change !== undefined && (
          <div className={`mt-2 flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="ml-1">{change.toFixed(1)}% from last period</span>
          </div>
        )}
      </div>
      <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
};

interface TimesheetOverviewProps {
  filters: {
    startDate: string;
    endDate: string;
    storeId?: string;
    zoneId?: string;
  };
  userRole: string;
  userStoreId?: string | null;
  userZoneId?: string | null;
}

export function TimesheetOverview({ filters, userRole, userStoreId, userZoneId }: TimesheetOverviewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['timesheet-overview', filters, userRole],
    queryFn: async () => {
      // ✅ CORRECTED: The query no longer selects the non-existent 'employee_id' column.
      let query = supabase
        .from('timesheets')
        .select('total_hours, employee_count, created_at, period_start, period_end, store_id, zone_id')
        .gte('period_start', filters.startDate)
        .lte('period_end', filters.endDate);

      // Apply role-based and explicit filters
      if (filters.storeId) query = query.eq('store_id', filters.storeId);
      else if (userRole === 'STORE_MANAGER' && userStoreId) query = query.eq('store_id', userStoreId);
      else if (filters.zoneId) query = query.eq('zone_id', filters.zoneId);
      else if (userRole === 'ASM' && userZoneId) query = query.eq('zone_id', userZoneId);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Process the data
      const totalHours = data.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
      const totalEmployees = data.reduce((sum, ts) => sum + (ts.employee_count || 0), 0);
      const totalGrids = data.length;
      const avgHoursPerEmployee = totalEmployees > 0 ? totalHours / totalEmployees : 0;

      return { totalHours, totalEmployees, totalGrids, avgHoursPerEmployee };
    },
  });

  if (isLoading) return <div>Încărcare overview...</div>;
  if (error) return (
    <div className="text-center p-8 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800">Overview-ul nu a putut fi incărcat</h3>
        <p className="text-red-600 mt-1">Nu s-au putut încărca datele pentru overview-ul pontajelor</p>
        {/* You can add a retry button here if needed */}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <OverviewCard title="Total ore" value={data?.totalHours.toFixed(1) || '0'} icon={Clock} />
      <OverviewCard title="Total Angajați" value={data?.totalEmployees.toString() || '0'} icon={Users} />
      <OverviewCard title="Grile Pontaj" value={data?.totalGrids.toString() || '0'} icon={BarChart} />
      <OverviewCard title="Medie Ore/Angajat" value={data?.avgHoursPerEmployee.toFixed(2) || '0'} icon={TrendingUp} />
    </div>
  );
}
