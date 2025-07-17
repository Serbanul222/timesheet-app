// lib/services/timesheetStatsProcessor.ts
import { differenceInDays } from 'date-fns';
import type { StoreStats, EmployeeStats, StatusBreakdown } from '@/hooks/timesheet/useTimesheetStatsData';

// A helper to safely check if a value is a plain object
const isObject = (value: any): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// A helper to determine the format of the daily_entries JSON
const getFormat = (data: any): 'new' | 'old' | 'unknown' => {
  if (!isObject(data)) return 'unknown';
  // The old format is uniquely identified by the `_employees` metadata key.
  if (data.hasOwnProperty('_employees')) return 'old';
  // If it's an object and doesn't have _employees, we'll treat it as the new format.
  // This is safer than checking for UUID keys and handles empty objects gracefully.
  return 'new';
};

const getDaysInPeriod = (startDate: string, endDate: string): number => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 30;
    return differenceInDays(end, start) + 1;
  } catch (e) {
    return 30;
  }
};

export function processStoreStats(timesheets: any[]): StoreStats[] {
  const storeMap = new Map<string, any>();

  timesheets.forEach(ts => {
    if (!ts.store_id) return;
    if (!storeMap.has(ts.store_id)) {
      storeMap.set(ts.store_id, {
        storeName: ts.store?.name || 'Unknown Store', totalHours: 0, employeeCount: 0,
        filledDays: 0, totalPossibleDays: 0,
      });
    }

    const store = storeMap.get(ts.store_id)!;
    store.totalHours += ts.total_hours || 0;
    store.employeeCount += ts.employee_count || 0;

    const employeesData = ts.daily_entries;
    const format = getFormat(employeesData);
    if (format === 'unknown') return;

    const periodDays = getDaysInPeriod(ts.period_start, ts.period_end);
    let employeeIds: string[] = [];
    let daysWithEntries = 0;

    if (format === 'old') {
      employeeIds = isObject(employeesData._employees) ? Object.keys(employeesData._employees) : [];
      Object.keys(employeesData).forEach(date => {
        if (date.startsWith('_')) return;
        daysWithEntries += Object.keys(employeesData[date]).length;
      });
    } else { // format === 'new'
      employeeIds = Object.keys(employeesData);
      employeeIds.forEach(empId => {
        if (isObject(employeesData[empId]) && isObject(employeesData[empId].days)) {
          daysWithEntries += Object.keys(employeesData[empId].days).length;
        }
      });
    }
    
    store.totalPossibleDays += (ts.employee_count || employeeIds.length) * periodDays;
    store.filledDays += daysWithEntries;
  });

  return Array.from(storeMap.entries()).map(([storeId, data]) => ({
    storeId, storeName: data.storeName, totalHours: data.totalHours, employeeCount: data.employeeCount,
    averageHours: data.employeeCount > 0 ? data.totalHours / data.employeeCount : 0,
    completionRate: data.totalPossibleDays > 0 ? (data.filledDays / data.totalPossibleDays) * 100 : 0,
  })).sort((a, b) => b.totalHours - a.totalHours);
}

export function processEmployeeStats(timesheets: any[]): EmployeeStats[] {
  const employeeMap = new Map<string, any>();

  timesheets.forEach(ts => {
    const employeesData = ts.daily_entries;
    const format = getFormat(employeesData);
    if (format === 'unknown') return;

    if (format === 'old') {
      if (!isObject(employeesData._employees)) return;
      Object.keys(employeesData._employees).forEach(empId => {
        const empInfo = employeesData._employees[empId];
        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            employeeName: empInfo.name, position: empInfo.position || 'Staff',
            totalHours: 0, daysWorked: 0,
          });
        }
        const employee = employeeMap.get(empId)!;
        Object.keys(employeesData).forEach(date => {
          if (date.startsWith('_')) return;
          const day = employeesData[date]?.[empId];
          if (isObject(day) && day.hours > 0) {
            employee.totalHours += day.hours;
            employee.daysWorked += 1;
          }
        });
      });
    } else { // format === 'new'
      Object.keys(employeesData).forEach(empId => {
        const empData = employeesData[empId];
        if (!isObject(empData) || !empData.name) return;

        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            employeeName: empData.name, position: empData.position || 'Staff',
            totalHours: 0, daysWorked: 0,
          });
        }
        const employee = employeeMap.get(empId)!;
        if (isObject(empData.days)) {
          Object.keys(empData.days).forEach(date => {
            const day = empData.days[date];
            if (isObject(day) && day.hours > 0) {
              employee.totalHours += day.hours;
              employee.daysWorked += 1;
            }
          });
        }
      });
    }
  });

  return Array.from(employeeMap.entries()).map(([employeeId, data]) => ({
    employeeId, ...data,
    averageDaily: data.daysWorked > 0 ? data.totalHours / data.daysWorked : 0,
    status: 'regular',
  })).sort((a, b) => b.totalHours - a.totalHours);
}

export function processStatusStats(timesheets: any[]): StatusBreakdown[] {
  const statusMap = new Map<string, { count: number; hours: number }>();
  
  const processDay = (day: any) => {
    if (!isObject(day)) return;
    const status = day.status || 'alege';
    
    // Use a more specific key for working hours to avoid conflicts
    const statusKey = (status === 'alege' || status === 'work') ? 'Working' : status;

    if (!statusMap.has(statusKey)) {
        statusMap.set(statusKey, { count: 0, hours: 0 });
    }
    const statusData = statusMap.get(statusKey)!;
    statusData.count += 1;
    if (statusKey === 'Working') {
        statusData.hours += day.hours || 0;
    }
  };

  timesheets.forEach(ts => {
    const employeesData = ts.daily_entries;
    const format = getFormat(employeesData);
    if (format === 'unknown') return;

    if (format === 'old') {
      Object.keys(employeesData).forEach(date => {
        if (date.startsWith('_')) return;
        const dateEntry = employeesData[date];
        if (isObject(dateEntry)) {
          Object.values(dateEntry).forEach(processDay);
        }
      });
    } else { // format === 'new'
      Object.values(employeesData).forEach((empData: any) => {
        if (isObject(empData) && isObject(empData.days)) {
          Object.values(empData.days).forEach(processDay);
        }
      });
    }
  });

  const getStatusDisplayName = (s: string) => ({'CO':'Time Off', 'CM':'Medical Leave', 'dispensa':'Dispensation', 'OFF':'Day Off'}[s] || s);
  let totalEntries = 0;
  statusMap.forEach(data => totalEntries += data.count);

  return Array.from(statusMap.entries()).map(([code, data]) => ({
    status: getStatusDisplayName(code), ...data,
    percentage: totalEntries > 0 ? (data.count / totalEntries) * 100 : 0,
  })).filter(item => item.count > 0).sort((a, b) => b.count - a.count);
}
