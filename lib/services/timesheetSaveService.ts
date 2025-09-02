// lib/services/timesheetSaveService.ts - Fixed duplication logic
import { supabase } from '@/lib/supabase/client';
import { TimesheetGridData, TimesheetEntry } from '@/types/timesheet-grid';
import { calculateTotalHours, generateDateRange } from '@/lib/timesheet-utils';
import { SaveOptions, SaveResult } from '@/types/database';
import { TimesheetValidationRules } from '@/lib/validation/timesheetValidationRules';
import { AbsenceTypesService } from '@/lib/services/absenceTypesService';
import { TimesheetDuplicationRules, DuplicationCheckResult } from '@/lib/validation/timesheetDuplicationRules';
import { formatMonthYearRomanian, formatDateForInput } from '@/lib/utils/dateFormatting';

// Re-export the types so they can be imported from this service
export type { SaveOptions, SaveResult } from '@/types/database';

// Enhanced SaveResult interface to include duplication info
export interface EnhancedSaveResult extends SaveResult {
  duplicationCheck?: DuplicationCheckResult;
}

// Enhanced SaveOptions interface to include duplication skip option
export interface EnhancedSaveOptions extends SaveOptions {
  skipDuplicationCheck?: boolean;
}

// DEBUG: Log that the enhanced service is being loaded
console.log('🔍 Enhanced TimesheetSaveService loaded with validation and duplication support');

export class TimesheetSaveService {
  
  /**
   * ENHANCED: Save method with duplication check and validation
   * Preserves all original logic while adding duplication prevention
   */
  public static async saveTimesheetGrid(
    gridData: TimesheetGridData, 
    options: EnhancedSaveOptions,
    skipValidation: boolean = false
  ): Promise<EnhancedSaveResult> {
    try {
      console.log('🔍 SaveService: Starting save process', { 
        skipValidation, 
        skipDuplication: options.skipDuplicationCheck,
        entriesCount: gridData.entries.length,
        storeId: gridData.storeId,
        isUpdate: !!gridData.id
      });

      // NEW: Step 0 - Check for duplicates BEFORE validation (for new timesheets only)
      if (!options.skipDuplicationCheck && !gridData.id && gridData.storeId) {
        console.log('🔍 SaveService: Running duplication check...', {
          storeId: gridData.storeId,
          startDate: gridData.startDate,
          endDate: gridData.endDate,
          employeeCount: gridData.entries.length
        });
        
        const duplicationCheck = await TimesheetDuplicationRules.checkForDuplicate(
          gridData.storeId,
          gridData.startDate,
          gridData.endDate,
          gridData.entries,
          gridData.id // Will be undefined for new timesheets
        );

        console.log('🔍 SaveService: Duplication check result:', duplicationCheck);

        if (duplicationCheck.hasDuplicate) {
          console.log('❌ SaveService: Duplicate timesheet found, blocking save');
          return this._buildDuplicationErrorResult(gridData, duplicationCheck, options.gridSessionId);
        }
        
        console.log('✅ SaveService: No duplicates found, proceeding');
      } else if (gridData.id) {
        console.log('⚠️ SaveService: Updating existing timesheet, skipping duplication check');
      } else {
        console.log('⚠️ SaveService: Duplication check skipped');
      }

      // PRESERVED: Step 1 - Run validation before saving (unless explicitly skipped)
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

      // PRESERVED: Step 2 - Transform and save
      console.log('🔍 SaveService: Transforming data for database...');
      const gridForDatabase = this._transformGridForDatabase(gridData, options);
      
      // FIXED: Only look for existing grid if this is an explicit update (has gridData.id)
      let existingGrid = null;
      let dbResult: { gridId: string; isUpdate: boolean };

      if (gridData.id) {
        // This is an explicit update - look for the specific grid
        existingGrid = { id: gridData.id };
        console.log('🔍 SaveService: Updating specific timesheet:', gridData.id);
        dbResult = await this._updateGrid(gridData.id, gridForDatabase);
      } else {
        // This is a new timesheet - create it directly (duplication already checked above)
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

  /**
   * NEW: Helper method to check duplicates without saving
   */
  public static async checkDuplication(
    storeId: string,
    startDate: string,
    endDate: string,
    entries: TimesheetEntry[],
    excludeTimesheetId?: string
  ): Promise<DuplicationCheckResult> {
    return TimesheetDuplicationRules.checkForDuplicate(
      storeId,
      startDate,
      endDate,
      entries,
      excludeTimesheetId
    );
  }

  // PRESERVED: Your original, detailed validation logic
  private static async _validateGridBeforeSave(gridData: TimesheetGridData) {
    try {
      console.log('🔍 Validation: Loading absence types...');
      const absenceTypes = await AbsenceTypesService.getActiveAbsenceTypes();
      console.log('🔍 Validation: Loaded absence types:', absenceTypes.length);

      // Check for ALL full-day absences + hours conflicts
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

  // NEW: Build duplication error result
  private static _buildDuplicationErrorResult(
    gridData: TimesheetGridData, 
    duplicationCheck: DuplicationCheckResult, 
    sessionId: string
  ): EnhancedSaveResult {
    console.log('🔍 SaveService: Building duplication error result');

    return {
      success: false,
      savedCount: 0,
      failedCount: gridData.entries.length,
      errors: [{
        employeeId: 'system',
        employeeName: 'System',
        error: duplicationCheck.message || 'Duplicate timesheet exists'
      }],
      savedTimesheets: [],
      sessionId: sessionId,
      warnings: [duplicationCheck.message || 'Duplicate timesheet detected'],
      duplicationCheck: duplicationCheck // Include duplication details for UI handling
    };
  }

  // PRESERVED: Your original error building logic
  private static _buildValidationErrorResult(gridData: TimesheetGridData, validationResult: any, sessionId: string): EnhancedSaveResult {
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

  // PRESERVED: All your original helper methods
  private static _transformGridForDatabase(gridData: TimesheetGridData, options: EnhancedSaveOptions) {
    // Ensure dates are always in the clean 'YYYY-MM-DD' format before saving
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

  // REMOVED: _findExistingGrid method - this was causing the issue
  // We now only create new timesheets or update existing ones with explicit IDs

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
    // Capitalize first letter for a clean title
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  private static _buildSuccessResult = (gridData: TimesheetGridData, dbResult: { gridId: string, isUpdate: boolean }, options: EnhancedSaveOptions): EnhancedSaveResult => ({
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

  private static _buildErrorResult = (gridData: TimesheetGridData, error: any, sessionId: string): EnhancedSaveResult => ({
    success: false,
    savedCount: 0,
    failedCount: gridData.entries.length,
    errors: [{ employeeId: 'grid', employeeName: 'Entire Grid', error: error.message || 'Unknown error' }],
    savedTimesheets: [],
    sessionId: sessionId,
  });
}