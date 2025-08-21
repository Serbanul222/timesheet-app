// lib/services/exportService.ts - Versiunea Finală în Limba Română (Doar Excel)
import { format, parseISO, eachDayOfInterval, isValid } from 'date-fns';
import { ro } from 'date-fns/locale/ro'; // Import pentru localizarea în limba română
import * as XLSX from 'xlsx';

//================================================================================
// TYPE DEFINITIONS (Actualizat pentru doar Excel)
//================================================================================
interface TimesheetRow { id: string; store_id: string; zone_id: string; period_start: string; period_end: string; total_hours: number; daily_entries: any; store?: { name: string }; zone?: { name: string }; }
interface ExportOptions { dateRange?: { startDate: string; endDate: string }; format: 'excel'; includeNotes?: boolean; includeEmptyDays?: boolean; filename?: string; }
interface ExportResult { success: boolean; data?: { buffer: ArrayBuffer; filename: string; mimeType: string }; error?: string; }

//================================================================================
// EXPORT SERVICE
//================================================================================
export class ExportService {
  static async exportTimesheets(
    timesheets: TimesheetRow[],
    options: ExportOptions
  ): Promise<ExportResult> {
    console.log(`[ExportService] 🚀 Starting export process for format: ${options.format}`);
    if (!timesheets || timesheets.length === 0) {
      return { success: false, error: 'Nu sunt date disponibile pentru export.' };
    }
    console.log(`[ExportService] Received ${timesheets.length} timesheet documents.`);
    try {
      if (options.format === 'excel') {
        return await this.generateExcel(timesheets, options);
      }
      throw new Error(`Format neacceptat: ${options.format}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'A apărut o eroare necunoscută în timpul exportului.';
      console.error('❌ [ExportService] A apărut o eroare critică în timpul procesului de export.', error);
      return { success: false, error: message };
    }
  }

  private static consolidateTimesheets(timesheets: TimesheetRow[]): TimesheetRow[] {
    const storeMap = new Map<string, TimesheetRow>();
    timesheets.forEach(timesheet => {
      const storeKey = `${timesheet.store_id}_${timesheet.zone_id}`;
      if (storeMap.has(storeKey)) {
        const existing = storeMap.get(storeKey)!;
        existing.daily_entries = { ...(existing.daily_entries || {}), ...(timesheet.daily_entries || {}) };
        if (new Date(timesheet.period_start) < new Date(existing.period_start)) existing.period_start = timesheet.period_start;
        if (new Date(timesheet.period_end) > new Date(existing.period_end)) existing.period_end = timesheet.period_end;
      } else {
        storeMap.set(storeKey, { ...timesheet });
      }
    });
    return Array.from(storeMap.values());
  }

  private static processTimesheetGrid(timesheets: TimesheetRow[], options: ExportOptions) {
    return timesheets.map(timesheet => {
      const storeName = timesheet.store?.name || 'Magazin Necunoscut';
      const employees = new Map<string, any>();
      const dailyEntries = timesheet.daily_entries || {};
      Object.entries(dailyEntries).forEach(([empId, empData]: [string, any]) => {
        if (empData && empData.name) {
          employees.set(empId, { id: empId, name: empData.name, position: empData.position || 'Staff' });
        }
      });
      let dateRange: Date[] = [];
      let periodStart = timesheet.period_start;
      let periodEnd = timesheet.period_end;
      if (options.dateRange?.startDate && options.dateRange?.endDate) {
        const start = parseISO(options.dateRange.startDate);
        const end = parseISO(options.dateRange.endDate);
        if (isValid(start) && isValid(end) && end >= start) {
          dateRange = eachDayOfInterval({ start, end });
          periodStart = options.dateRange.startDate;
          periodEnd = options.dateRange.endDate;
        }
      }
      if (dateRange.length === 0) {
        const start = parseISO(timesheet.period_start);
        const end = parseISO(timesheet.period_end);
        if (isValid(start) && isValid(end)) dateRange = eachDayOfInterval({ start, end });
      }
      return { id: timesheet.id, storeName, zoneName: timesheet.zone?.name || 'Zonă Necunoscută', periodStart, periodEnd, employees: Array.from(employees.values()), dateRange, dailyEntries };
    });
  }

  private static getDayValue(employeeId: string, dateKey: string, dailyEntries: any, includeEmptyDays: boolean): string {
    const dayData = dailyEntries?.[employeeId]?.days?.[dateKey];
    if (!dayData) return includeEmptyDays ? 'liber' : ''; // Tradus 'off'
    if (dayData.timeInterval && dayData.timeInterval.trim() && dayData.timeInterval !== 'alege') return dayData.timeInterval;
    if (dayData.status && dayData.status.trim() && dayData.status !== 'alege') return dayData.status;
    if (dayData.startTime && dayData.endTime) return `${dayData.startTime.split(':')[0]}-${dayData.endTime.split(':')[0]}`;
    if (dayData.hours && dayData.hours > 0) return `${dayData.hours}h`;
    return includeEmptyDays ? 'liber' : '';
  }
  
  private static async generateExcel(timesheets: TimesheetRow[], options: ExportOptions): Promise<ExportResult> {
    const workbook = XLSX.utils.book_new();
    const processedTimesheets = this.processTimesheetGrid(this.consolidateTimesheets(timesheets), options);
    let sheetsGenerated = 0;
    
    processedTimesheets.forEach(timesheet => {
      if (timesheet.employees.length === 0) return;
      sheetsGenerated++;
      
      const sheetData: any[][] = [];
      // === MODIFICĂRI PENTRU TRADUCERE ===
      sheetData.push([`Magazin: ${timesheet.storeName}`]);
      sheetData.push([`Perioada: ${format(parseISO(timesheet.periodStart), 'dd/MM/yyyy')} - ${format(parseISO(timesheet.periodEnd), 'dd/MM/yyyy')}`]);
      sheetData.push([]); // Rând gol

      const headers = ['Nume Angajat', 'Poziție', ...timesheet.dateRange.map(date => format(date, 'd'))];
      
      const weekdayRow = ['', '', ...timesheet.dateRange.map(date => {
        // Formatează ziua săptămânii folosind localizarea românească (ex: 'Lun', 'Mar')
        const dayName = format(date, 'EEE', { locale: ro });
        // Asigură prima literă majusculă și elimină punctul (ex: 'Lun.' -> 'Lun')
        return dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', '');
      })];

      sheetData.push(headers, weekdayRow);
      
      let periodTotalHours = 0;
      timesheet.employees.forEach(employee => {
        const row = [employee.name, employee.position];
        timesheet.dateRange.forEach(date => {
          const dateKey = format(date, 'dd/MM/yyyy'); // Formatul corect pentru baza de date
          const dayValue = this.getDayValue(employee.id, dateKey, timesheet.dailyEntries, options.includeEmptyDays ?? false);
          row.push(dayValue);
          periodTotalHours += timesheet.dailyEntries?.[employee.id]?.days?.[dateKey]?.hours || 0;
        });
        sheetData.push(row);
      });
      
      sheetData.push([], ['', `Total Ore: ${periodTotalHours}`]);

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      worksheet['!cols'] = [{ wch: 25 }, { wch: 15 }, ...timesheet.dateRange.map(() => ({ wch: 8 }))];
      const safeSheetName = timesheet.storeName.replace(/[*?:/\\\[\]]/g, '').substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    });

    if (sheetsGenerated === 0) return { success: false, error: "Exportul a eșuat deoarece nu s-au găsit date valide pentru criteriile selectate." };
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const filename = options.filename || `pontaje_${format(parseISO(options.dateRange!.startDate), 'dd-MM-yyyy')}.xlsx`;
    
    return { success: true, data: { buffer: excelBuffer, filename, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } };
  }
}