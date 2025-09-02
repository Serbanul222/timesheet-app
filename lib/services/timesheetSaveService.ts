// lib/services/timesheetSaveService.ts - FINAL AND CORRECTED
import { supabase } from '@/lib/supabase/client';
import { TimesheetGridData, TimesheetEntry } from '@/types/timesheet-grid';
import { calculateTotalHours, generateDateRange } from '@/lib/timesheet-utils';
import { SaveOptions, SaveResult } from '@/types/database';
import { TimesheetValidationRules } from '@/lib/validation/timesheetValidationRules';
import { AbsenceTypesService, AbsenceType } from '@/lib/services/absenceTypesService';
import { AbsenceHoursRules } from '@/lib/validation/absenceHoursRules';
import { TimesheetDuplicationRules, DuplicationCheckResult } from '@/lib/validation/timesheetDuplicationRules';
import { formatMonthYearRomanian, formatDateForInput } from '@/lib/utils/dateFormatting';

export type { SaveOptions, SaveResult } from '@/types/database';

export interface EnhancedSaveResult extends SaveResult {
  duplicationCheck?: DuplicationCheckResult;
}

export interface EnhancedSaveOptions extends SaveOptions {
  skipDuplicationCheck?: boolean;
}

export class TimesheetSaveService {
  
  public static async saveTimesheetGrid(
    gridData: TimesheetGridData, 
    options: EnhancedSaveOptions,
    skipValidation: boolean = false
  ): Promise<EnhancedSaveResult> {
    try {
      if (!options.skipDuplicationCheck && !gridData.id && gridData.storeId) {
        const duplicationCheck = await TimesheetDuplicationRules.checkForDuplicate(
          gridData.storeId, gridData.startDate, gridData.endDate, gridData.entries, gridData.id
        );
        if (duplicationCheck.hasDuplicate) {
          return this._buildDuplicationErrorResult(gridData, duplicationCheck, options.gridSessionId);
        }
      }

      const absenceTypes = await AbsenceTypesService.getActiveAbsenceTypes();

      if (!skipValidation) {
        const validationResult = await this._validateGridBeforeSave(gridData, absenceTypes);
        if (!validationResult.isValid) {
          return this._buildValidationErrorResult(gridData, validationResult, options.gridSessionId);
        }
      }

      const gridForDatabase = this._transformGridForDatabase(gridData, options, absenceTypes);
      
      let dbResult: { gridId: string; isUpdate: boolean };
      if (gridData.id) {
        dbResult = await this._updateGrid(gridData.id, gridForDatabase);
      } else {
        dbResult = await this._createGrid(gridForDatabase);
      }

      return this._buildSuccessResult(gridData, dbResult, options);
    } catch (error) {
      return this._buildErrorResult(gridData, error, options.gridSessionId);
    }
  }

  public static async checkDuplication(
    storeId: string, startDate: string, endDate: string, entries: TimesheetEntry[], excludeTimesheetId?: string
  ): Promise<DuplicationCheckResult> {
    return TimesheetDuplicationRules.checkForDuplicate(storeId, startDate, endDate, entries, excludeTimesheetId);
  }

  private static async _validateGridBeforeSave(gridData: TimesheetGridData, absenceTypes: AbsenceType[]) {
    try {
      const dateRange = generateDateRange(new Date(gridData.startDate), new Date(gridData.endDate));
      return TimesheetValidationRules.validateGrid(gridData.entries, dateRange, absenceTypes, gridData);
    } catch (error) {
      const validationError: any = {
        isValid: false,
        errors: [{
          employeeId: 'system', employeeName: 'Validation System', date: 'N/A',
          error: 'Failed to run validation checks: ' + (error instanceof Error ? error.message : 'Unknown error')
        }],
        warnings: [],
        setupErrors: []
      };
      return validationError;
    }
  }

  private static _buildDuplicationErrorResult(
    gridData: TimesheetGridData, duplicationCheck: DuplicationCheckResult, sessionId: string
  ): EnhancedSaveResult {
    return {
      success: false, savedCount: 0, failedCount: gridData.entries.length,
      errors: [{ employeeId: 'system', employeeName: 'System', error: duplicationCheck.message || 'Duplicate timesheet exists' }],
      savedTimesheets: [], sessionId: sessionId, warnings: [duplicationCheck.message || 'Duplicate timesheet detected'],
      duplicationCheck: duplicationCheck
    };
  }

  private static _buildValidationErrorResult(gridData: TimesheetGridData, validationResult: any, sessionId: string): EnhancedSaveResult {
    const allErrors = [
      ...validationResult.errors.map((e: any) => `${e.employeeName} (${e.date}): ${e.error}`),
      ...validationResult.setupErrors.map((e: any) => `Setup: ${e.error}`)
    ];
    return {
      success: false, savedCount: 0, failedCount: gridData.entries.length,
      errors: validationResult.errors.map((error: any) => ({ employeeId: error.employeeId, employeeName: error.employeeName, error: error.error })),
      savedTimesheets: [], sessionId: sessionId, warnings: allErrors
    };
  }

  private static _transformGridForDatabase(
    gridData: TimesheetGridData, 
    options: EnhancedSaveOptions,
    absenceTypes: AbsenceType[]
  ) {
    const period_start = formatDateForInput(gridData.startDate);
    const period_end = formatDateForInput(gridData.endDate);
    const totalHours = gridData.entries.reduce((acc, entry) => acc + calculateTotalHours(entry.days, absenceTypes), 0);

    return {
      store_id: gridData.storeId,
      zone_id: gridData.zoneId,
      period_start: period_start,
      period_end: period_end,
      total_hours: totalHours,
      employee_count: gridData.entries.length,
      daily_entries: this._createDailyEntriesJSON(gridData, absenceTypes),
      grid_title: this._generateGridTitle(gridData),
      notes: `Grid session: ${options.gridSessionId}`,
      created_by: options.createdBy,
    };
  }

  /**
   * NEW: Uses centralized absence rules for consistent database storage
   */
  private static _createDailyEntriesJSON(gridData: TimesheetGridData, absenceTypes: AbsenceType[]): any {
    const employeeEntries: { [employeeId: string]: any } = {};

    gridData.entries.forEach(entry => {
      employeeEntries[entry.employeeId] = { name: entry.employeeName, position: entry.position, days: {} };
      for (const date in entry.days) {
        const dayData = entry.days[date];
        const hasData = dayData && (dayData.hours > 0 || (dayData.status && dayData.status !== 'alege') || (dayData.notes && dayData.notes.trim() !== '') || (dayData.timeInterval && dayData.timeInterval.trim() !== ''));
        
        if (hasData) {
          // Use centralized rule to determine database hours
          const effectiveHours = AbsenceHoursRules.calculateEffectiveHours(dayData, absenceTypes);
          
          employeeEntries[entry.employeeId].days[date] = {
            timeInterval: dayData.timeInterval || '', 
            startTime: dayData.startTime || '',
            endTime: dayData.endTime || '', 
            hours: effectiveHours.hours,
            status: dayData.status, 
            notes: dayData.notes || '',
          };
        }
      }
    });
    return employeeEntries;
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
  
  private static _generateGridTitle = (gridData: TimesheetGridData) => {
    const monthYear = formatMonthYearRomanian(gridData.startDate);
    const title = `${monthYear} - ${gridData.entries.length} angajati`;
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  private static _buildSuccessResult = (gridData: TimesheetGridData, dbResult: { gridId: string, isUpdate: boolean }, options: EnhancedSaveOptions): EnhancedSaveResult => ({
    success: true,
    savedCount: gridData.entries.length,
    failedCount: 0,
    errors: [],
    savedTimesheets: gridData.entries.map(e => ({ employeeId: e.employeeId, employeeName: e.employeeName, timesheetId: dbResult.gridId, isUpdate: dbResult.isUpdate })),
    sessionId: options.gridSessionId,
  });

  private static _buildErrorResult = (gridData: TimesheetGridData, error: any, sessionId: string): EnhancedSaveResult => ({
    success: false,
    savedCount: 0,
    failedCount: gridData.entries.length,
    errors: [{ employeeId: 'grid', employeeName: 'Entire Grid', error: error.message || 'Unknown error' }],
    savedTimesheets: [],
    sessionId: sessionId,
  });
}