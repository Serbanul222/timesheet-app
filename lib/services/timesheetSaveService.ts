// lib/services/timesheetSaveService.ts - COMPLETE FILE with original logic restored and targeted date fixes
import { supabase } from '@/lib/supabase/client';
import { TimesheetGridData } from '@/types/timesheet-grid';
import { calculateTotalHours, generateDateRange } from '@/lib/timesheet-utils';
import { SaveOptions, SaveResult } from '@/types/database';
import { TimesheetValidationRules } from '@/lib/validation/timesheetValidationRules';
import { AbsenceTypesService } from '@/lib/services/absenceTypesService';

// ✅ THE FIX: Import the necessary timezone-safe date formatting functions.
import { formatMonthYearRomanian, formatDateForInput } from '@/lib/utils/dateFormatting';

// Re-export the types so they can be imported from this service
export type { SaveOptions, SaveResult } from '@/types/database';

// DEBUG: Log that the enhanced service is being loaded
console.log('🔍 Enhanced TimesheetSaveService loaded with validation support');

export class TimesheetSaveService {
  
  // ENHANCED: Save method with validation
  public static async saveTimesheetGrid(
    gridData: TimesheetGridData, 
    options: SaveOptions,
    skipValidation: boolean = false
  ): Promise<SaveResult> {
    try {
      console.log('🔍 SaveService: Starting save process', { 
        skipValidation, 
        entriesCount: gridData.entries.length,
        storeId: gridData.storeId
      });

      // STEP 1: Run validation before saving (unless explicitly skipped)
      if (!skipValidation) {
        console.log('🔍 SaveService: Running validation...');
        const validationResult = await this._validateGridBeforeSave(gridData);
        
        console.log('🔍 SaveService: Validation result:', {
          isValid: validationResult.isValid,
          errorsCount: validationResult.errors.length,
          warningsCount: validationResult.warnings.length,
          setupErrorsCount: validationResult.setupErrors.length
        });

        if (!validationResult.isValid) {
          console.log('❌ SaveService: Validation failed, blocking save');
          console.log('❌ SaveService: Validation errors:', validationResult.errors);
          return this._buildValidationErrorResult(gridData, validationResult, options.gridSessionId);
        }
        
        console.log('✅ SaveService: Validation passed, proceeding with save');
      } else {
        console.log('⚠️ SaveService: Validation skipped');
      }

      // STEP 2: Transform and save
      console.log('🔍 SaveService: Transforming data for database...');
      const gridForDatabase = this._transformGridForDatabase(gridData, options);
      
      // ✅ THE FIX: Use the sanitized dates from gridForDatabase to find the existing grid.
      const existingGrid = await this._findExistingGrid(
          gridForDatabase.store_id!, 
          gridForDatabase.period_start, 
          gridForDatabase.period_end
      );

      let dbResult: { gridId: string; isUpdate: boolean };

      if (existingGrid) {
        console.log('🔍 SaveService: Updating existing grid:', existingGrid.id);
        dbResult = await this._updateGrid(existingGrid.id, gridForDatabase);
      } else {
        console.log('🔍 SaveService: Creating new grid');
        dbResult = await this._createGrid(gridForDatabase);
      }

      console.log('✅ SaveService: Database operation successful, gridId:', dbResult.gridId);
      return this._buildSuccessResult(gridData, dbResult, options);
    } catch (error) {
      console.error('❌ SaveService: Save failed:', error);
      return this._buildErrorResult(gridData, error, options.gridSessionId);
    }
  }

  // ✅ RESTORED: Your original, detailed validation logic is fully restored.
  private static async _validateGridBeforeSave(gridData: TimesheetGridData) {
    try {
      console.log('🔍 Validation: Loading absence types...');
      const absenceTypes = await AbsenceTypesService.getActiveAbsenceTypes();
      console.log('🔍 Validation: Loaded absence types:', absenceTypes.length);

      // ENHANCED: Check for ALL full-day absences + hours conflicts
      const errors: any[] = [];
      
      // Create a map of status codes to their requires_hours property for fast lookup
      const absenceTypeMap = new Map(
        absenceTypes.map(type => [type.code, type])
      );
      
      console.log('🔍 Validation: Checking for full-day absence + hours conflicts...');
      console.log('🔍 Validation: Full-day absence types (requires_hours: false):', 
        absenceTypes.filter(t => !t.requires_hours).map(t => `${t.code} (${t.name})`));
      
      gridData.entries.forEach(entry => {
        Object.entries(entry.days).forEach(([date, dayData]) => {
          // Skip if no status or default status
          if (!dayData.status || dayData.status === 'alege') {
            return;
          }
          
          const absenceType = absenceTypeMap.get(dayData.status);
          
          if (absenceType) {
            // Check if this is a full-day absence (requires_hours: false) with working hours
            const isFullDayAbsence = !absenceType.requires_hours;
            const hasWorkingHours = dayData.hours > 0;
            
            if (isFullDayAbsence && hasWorkingHours) {
              console.log('❌ Validation: Found full-day absence with hours conflict:', {
                employee: entry.employeeName, date: date, status: dayData.status,
                absenceTypeName: absenceType.name, hours: dayData.hours,
                timeInterval: dayData.timeInterval, requiresHours: absenceType.requires_hours
              });
              
              errors.push({
                employeeId: entry.employeeId, employeeName: entry.employeeName, date: date,
                error: `Nu poți avea ore de lucru împreună cu ${absenceType.name}`
              });
            }
            
            // ALSO CHECK: Partial absence without hours
            const isPartialAbsence = absenceType.requires_hours;
            const hasNoWorkingHours = dayData.hours === 0;
            
            if (isPartialAbsence && hasNoWorkingHours) {
              console.log('❌ Validation: Found partial absence without hours:', {
                employee: entry.employeeName, date: date, status: dayData.status,
                absenceTypeName: absenceType.name, hours: dayData.hours,
                requiresHours: absenceType.requires_hours
              });
              
              errors.push({
                employeeId: entry.employeeId, employeeName: entry.employeeName, date: date,
                error: `${absenceType.name} necesită ca orele de lucru să fie adăugate`
              });
            }
          } else if (dayData.status !== 'alege') {
            // Unknown status code
            console.log('⚠️ Validation: Unknown absence type:', {
              employee: entry.employeeName, date: date, status: dayData.status
            });
            
            errors.push({
              employeeId: entry.employeeId, employeeName: entry.employeeName, date: date,
              error: `Unknown absence type: ${dayData.status}`
            });
          }
        });
      });
      
      if (errors.length > 0) {
        console.log('❌ Validation: Found validation errors, blocking save:', errors);
        return {
          isValid: false, errors: errors, warnings: [], setupErrors: []
        };
      }
      
      console.log('✅ Validation: No absence+hours conflicts found');
      
      const dateRange = generateDateRange(new Date(gridData.startDate), new Date(gridData.endDate));

      console.log('🔍 Validation: Running comprehensive grid validation...');
      // Run comprehensive grid validation
      const validationResult = TimesheetValidationRules.validateGrid(
        gridData.entries, dateRange, absenceTypes, gridData
      );

      console.log('🔍 Validation: Comprehensive validation completed:', validationResult);
      return validationResult;
    } catch (error) {
      console.error('❌ Validation: Failed during validation:', error);
      return {
        isValid: false,
        errors: [{
          employeeId: 'system', employeeName: 'Validation System', date: 'N/A',
          error: 'Failed to run validation checks: ' + (error instanceof Error ? error.message : 'Unknown error')
        }],
        warnings: [],
        setupErrors: []
      };
    }
  }

  // ✅ RESTORED: Your original error building logic.
  private static _buildValidationErrorResult(gridData: TimesheetGridData, validationResult: any, sessionId: string): SaveResult {
    const allErrors = [
      ...validationResult.errors.map((e: any) => `${e.employeeName} (${e.date}): ${e.error}`),
      ...validationResult.setupErrors.map((e: any) => `Setup: ${e.error}`)
    ];

    console.log('🔍 SaveService: Building validation error result:', allErrors);

    return {
      success: false, savedCount: 0, failedCount: gridData.entries.length,
      errors: validationResult.errors.map((error: any) => ({
        employeeId: error.employeeId, employeeName: error.employeeName, error: error.error
      })),
      savedTimesheets: [], sessionId: sessionId, warnings: allErrors
    };
  }

  private static _transformGridForDatabase(gridData: TimesheetGridData, options: SaveOptions) {
    // ✅ THE FIX: Ensure dates are always in the clean 'YYYY-MM-DD' format before saving.
    const period_start = formatDateForInput(gridData.startDate);
    const period_end = formatDateForInput(gridData.endDate);

    return {
      store_id: gridData.storeId,
      zone_id: gridData.zoneId,
      period_start: period_start,
      period_end: period_end,
      total_hours: gridData.entries.reduce((acc, entry) => acc + calculateTotalHours(entry.days), 0),
      employee_count: gridData.entries.length,
      daily_entries: this._createDailyEntriesJSON(gridData),
      grid_title: this._generateGridTitle(gridData),
      notes: `Grid session: ${options.gridSessionId}`,
      created_by: options.createdBy,
    };
  }

  // ✅ RESTORED: Your original JSON creation logic.
  private static _createDailyEntriesJSON(gridData: TimesheetGridData): any {
    const employeeEntries: { [employeeId: string]: any } = {};
    gridData.entries.forEach(entry => {
      employeeEntries[entry.employeeId] = {
        name: entry.employeeName, position: entry.position, days: {},
      };
      for (const date in entry.days) {
        const dayData = entry.days[date];
        const hasData = dayData && (
          dayData.hours > 0 ||
          (dayData.status && dayData.status !== 'alege') ||
          (dayData.notes && dayData.notes.trim() !== '') ||
          (dayData.timeInterval && dayData.timeInterval.trim() !== '')
        );
        if (hasData) {
          employeeEntries[entry.employeeId].days[date] = {
            timeInterval: dayData.timeInterval || '', startTime: dayData.startTime || '',
            endTime: dayData.endTime || '', hours: dayData.hours,
            status: dayData.status, notes: dayData.notes || '',
          };
        }
      }
    });
    return employeeEntries;
  }

  private static async _findExistingGrid(storeId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase.from('timesheets').select('id').eq('store_id', storeId).eq('period_start', startDate).eq('period_end', endDate).maybeSingle();
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
  
  // ✅ THE FIX: Replace the faulty date logic with your robust, timezone-safe formatting utility.
  private static _generateGridTitle = (gridData: TimesheetGridData) => {
    const monthYear = formatMonthYearRomanian(gridData.startDate);
    const title = `${monthYear} - ${gridData.entries.length} angajati`;
    // Capitalize first letter for a clean title
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  private static _buildSuccessResult = (gridData: TimesheetGridData, dbResult: { gridId: string, isUpdate: boolean }, options: SaveOptions): SaveResult => ({
    success: true,
    savedCount: gridData.entries.length,
    failedCount: 0,
    errors: [],
    savedTimesheets: gridData.entries.map(e => ({ 
      employeeId: e.employeeId, 
      employeeName: e.employeeName, 
      timesheetId: dbResult.gridId, 
      isUpdate: dbResult.isUpdate 
    })),
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