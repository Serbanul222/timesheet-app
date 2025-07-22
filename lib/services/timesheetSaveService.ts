// lib/services/timesheetSaveService.ts - FIXED: Now preserves time intervals
import { supabase } from '@/lib/supabase/client';
import { TimesheetGridData } from '@/types/timesheet-grid';
import { calculateTotalHours } from '@/lib/timesheet-utils';
import { SaveOptions, SaveResult } from '@/types/database';

export class TimesheetSaveService {
  public static async saveTimesheetGrid(gridData: TimesheetGridData, options: SaveOptions): Promise<SaveResult> {
    try {
      const gridForDatabase = this._transformGridForDatabase(gridData, options);
      const existingGrid = await this._findExistingGrid(gridData.storeId!, gridData.startDate, gridData.endDate);

      let dbResult: { gridId: string; isUpdate: boolean };

      if (existingGrid) {
        dbResult = await this._updateGrid(existingGrid.id, gridForDatabase);
      } else {
        dbResult = await this._createGrid(gridForDatabase);
      }

      return this._buildSuccessResult(gridData, dbResult, options);
    } catch (error) {
      console.error('❌ Grid save failed:', error);
      return this._buildErrorResult(gridData, error, options.gridSessionId);
    }
  }

  private static _transformGridForDatabase(gridData: TimesheetGridData, options: SaveOptions) {
    const totalHours = gridData.entries.reduce((acc, entry) => acc + calculateTotalHours(entry.days), 0);
    const employeeCount = gridData.entries.length;
    const gridTitle = this._generateGridTitle(gridData);
    const dailyEntries = this._createDailyEntriesJSON(gridData); // ✅ FIXED: Now preserves intervals

    return {
      store_id: gridData.storeId,
      zone_id: gridData.zoneId,
      period_start: gridData.startDate,
      period_end: gridData.endDate,
      total_hours: totalHours,
      employee_count: employeeCount,
      daily_entries: dailyEntries,
      grid_title: gridTitle,
      notes: `Grid session: ${options.gridSessionId}`,
      created_by: options.createdBy,
    };
  }

  // ✅ FIXED: Now preserves timeInterval in the database
  private static _createDailyEntriesJSON(gridData: TimesheetGridData): any {
    const employeeEntries: { [employeeId: string]: any } = {};

    gridData.entries.forEach(entry => {
      // Initialize the structure for each employee
      employeeEntries[entry.employeeId] = {
        name: entry.employeeName,
        position: entry.position,
        days: {},
      };

      // Iterate over the days for the current employee
      for (const date in entry.days) {
        const dayData = entry.days[date];

        // Condition to check if there's any meaningful data to save for the day
        const hasData = dayData && (
          dayData.hours > 0 ||
          (dayData.status && dayData.status !== 'alege') ||
          (dayData.notes && dayData.notes.trim() !== '') ||
          (dayData.timeInterval && dayData.timeInterval.trim() !== '') // ✅ ADDED: Check for timeInterval
        );

        if (hasData) {
          // ✅ FIXED: Now save ALL time-related fields including timeInterval
          employeeEntries[entry.employeeId].days[date] = {
            timeInterval: dayData.timeInterval || '', // ✅ PRESERVE: Original time interval string
            startTime: dayData.startTime || '',       // ✅ PRESERVE: Start time
            endTime: dayData.endTime || '',           // ✅ PRESERVE: End time
            hours: dayData.hours,                     // ✅ PRESERVE: Calculated hours
            status: dayData.status,                   // ✅ PRESERVE: Status
            notes: dayData.notes || '',               // ✅ PRESERVE: Notes
          };
        }
      }
    });

    return employeeEntries;
  }

  // No changes needed to the functions below
  private static async _findExistingGrid(storeId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('timesheets')
      .select('id')
      .eq('store_id', storeId)
      .eq('period_start', startDate)
      .eq('period_end', endDate)
      .maybeSingle();

    if (error) {
      console.error('Error finding existing grid:', error.message);
      return null;
    }
    return data;
  }

  private static async _createGrid(gridData: any): Promise<{ gridId: string; isUpdate: boolean }> {
    const { data, error } = await supabase.from('timesheets').insert(gridData).select('id').single();
    if (error) throw new Error(`Failed to create grid: ${error.message}`);
    return { gridId: data.id, isUpdate: false };
  }

  private static async _updateGrid(gridId: string, gridData: any): Promise<{ gridId: string; isUpdate: boolean }> {
    const { data, error } = await supabase.from('timesheets').update(gridData).eq('id', gridId).select('id').single();
    if (error) throw new Error(`Failed to update grid: ${error.message}`);
    return { gridId: data.id, isUpdate: true };
  }
  
  private static _generateGridTitle = (gridData: TimesheetGridData) => `${new Date(gridData.startDate).toLocaleString('default', { month: 'long', year: 'numeric' })} - ${gridData.entries.length} employees`;
  
  private static _buildSuccessResult = (gridData: TimesheetGridData, dbResult: { gridId: string, isUpdate: boolean }, options: SaveOptions): SaveResult => ({
      success: true,
      savedCount: gridData.entries.length,
      failedCount: 0,
      errors: [],
      savedTimesheets: gridData.entries.map(e => ({ employeeId: e.employeeId, employeeName: e.employeeName, timesheetId: dbResult.gridId, isUpdate: dbResult.isUpdate })),
      sessionId: options.gridSessionId,
  });

  private static _buildErrorResult = (gridData: TimesheetGridData, error: any, sessionId: string): SaveResult => ({
      success: false,
      savedCount: 0,
      failedCount: gridData.entries.length,
      errors: [{ employeeId: 'grid', employeeName: 'Entire Grid', error: error.message || 'Unknown error' }],
      savedTimesheets: [],
      sessionId: sessionId,
  });
}