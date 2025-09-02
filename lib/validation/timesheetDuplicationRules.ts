// lib/validation/timesheetDuplicationRules.ts - Fixed to block all same month timesheets
import { supabase } from '@/lib/supabase/client'
import { type TimesheetEntry } from '@/types/timesheet-grid'

export interface ExistingTimesheetInfo {
  id: string
  period_start: string
  period_end: string
  store_id: string
  total_hours: number
  employee_count: number
  created_at: string
  updated_at: string
  store?: { name: string }
}

export interface DuplicationCheckResult {
  hasDuplicate: boolean
  existingTimesheet?: ExistingTimesheetInfo
  conflictType?: 'exact_period' | 'overlapping_period' | 'same_month'
  message?: string
  canEdit?: boolean
}

/**
 * Rules for checking timesheet duplication
 */
export class TimesheetDuplicationRules {
  /**
   * Check if a timesheet already exists for the given parameters
   * UPDATED: Now blocks ANY timesheet for the same month in the same store
   */
  static async checkForDuplicate(
    storeId: string,
    startDate: string,
    endDate: string,
    entries: TimesheetEntry[],
    excludeTimesheetId?: string
  ): Promise<DuplicationCheckResult> {
    try {
      console.log('🔍 DuplicationRules: Starting duplicate check', {
        storeId,
        startDate,
        endDate,
        employeeCount: entries.length,
        excludeTimesheetId
      });

      // Query for existing timesheets in the same store and overlapping period
      let query = supabase
        .from('timesheets')
        .select(`
          id,
          period_start,
          period_end,
          store_id,
          total_hours,
          employee_count,
          created_at,
          updated_at,
          daily_entries,
          store:stores(name)
        `)
        .eq('store_id', storeId)

      // Exclude current timesheet if editing
      if (excludeTimesheetId) {
        query = query.neq('id', excludeTimesheetId)
        console.log('🔍 DuplicationRules: Excluding timesheet ID:', excludeTimesheetId);
      }

      // Check for overlapping periods
      query = query
        .lte('period_start', endDate)
        .gte('period_end', startDate)

      const { data: existingTimesheets, error } = await query

      if (error) {
        console.error('❌ DuplicationRules: Error checking for duplicate timesheets:', error)
        return { hasDuplicate: false }
      }

      console.log('🔍 DuplicationRules: Found existing timesheets:', existingTimesheets?.length || 0);

      if (!existingTimesheets || existingTimesheets.length === 0) {
        console.log('✅ DuplicationRules: No existing timesheets found');
        return { hasDuplicate: false }
      }

      // Check each existing timesheet for conflicts
      for (const existing of existingTimesheets) {
        console.log('🔍 DuplicationRules: Checking existing timesheet:', {
          id: existing.id,
          period_start: existing.period_start,
          period_end: existing.period_end,
          employee_count: existing.employee_count
        });

        const conflictResult = this.analyzeConflict(
          existing,
          startDate,
          endDate,
          entries
        )

        if (conflictResult.hasDuplicate) {
          console.log('❌ DuplicationRules: Conflict found:', conflictResult.conflictType);
          return conflictResult
        }
      }

      console.log('✅ DuplicationRules: No conflicts found');
      return { hasDuplicate: false }

    } catch (error) {
      console.error('❌ DuplicationRules: Error in duplication check:', error)
      return { hasDuplicate: false }
    }
  }

  /**
   * Analyze conflict between existing timesheet and new parameters
   * UPDATED: Now blocks ALL same month timesheets regardless of employee overlap
   */
  private static analyzeConflict(
    existingTimesheet: any,
    newStartDate: string,
    newEndDate: string,
    newEmployeeIds: TimesheetEntry[]
  ): DuplicationCheckResult {
    const existing = existingTimesheet
    const existingStart = new Date(existing.period_start)
    const existingEnd = new Date(existing.period_end)
    const newStart = new Date(newStartDate)
    const newEnd = new Date(newEndDate)

    console.log('🔍 DuplicationRules: Analyzing conflict', {
      existingPeriod: `${existing.period_start} to ${existing.period_end}`,
      newPeriod: `${newStartDate} to ${newEndDate}`,
      existingMonth: `${existingStart.getFullYear()}-${existingStart.getMonth()}`,
      newMonth: `${newStart.getFullYear()}-${newStart.getMonth()}`
    });

    // Check for exact period match
    if (
      existingStart.getTime() === newStart.getTime() &&
      existingEnd.getTime() === newEnd.getTime()
    ) {
      console.log('❌ DuplicationRules: Exact period match found');
      return {
        hasDuplicate: true,
        existingTimesheet: existing,
        conflictType: 'exact_period',
        message: 'Un pontaj există pentru această perioadă.',
        canEdit: true
      }
    }

    // UPDATED: Check for same month conflict - Block ALL same month regardless of employees
    if (
      existingStart.getMonth() === newStart.getMonth() &&
      existingStart.getFullYear() === newStart.getFullYear()
    ) {
      console.log('❌ DuplicationRules: Same month conflict found');
      return {
        hasDuplicate: true,
        existingTimesheet: existing,
        conflictType: 'same_month',
        message: 'Un pontaj există pentru această lună. Se permite doar un pontaj pe lună per magazin.',
        canEdit: true
      }
    }

    // Check for overlapping period
    if (this.periodsOverlap(existingStart, existingEnd, newStart, newEnd)) {
      console.log('❌ DuplicationRules: Overlapping period found');
      return {
        hasDuplicate: true,
        existingTimesheet: existing,
        conflictType: 'overlapping_period',
        message: 'Un pontaj cu o perioadă care se suprapune există deja.',
        canEdit: true
      }
    }

    console.log('✅ DuplicationRules: No conflict found for this timesheet');
    return { hasDuplicate: false }
  }

  /**
   * Check if two periods overlap
   */
  private static periodsOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date
  ): boolean {
    return start1 <= end2 && start2 <= end1
  }

  /**
   * Get user-friendly message for conflict type
   */
  static getConflictMessage(conflictType: string, storeName?: string): string {
    const store = storeName ? ` la ${storeName}` : ''
    
    switch (conflictType) {
      case 'exact_period':
        return `Există deja un pontaj pentru aceeași perioadă${store}. Puteți edita pontajul existent în loc să creați unul nou.`
      case 'same_month':
        return `Există deja un pontaj pentru această lună${store}. Se permite doar un pontaj pe lună per magazin. Puteți edita pontajul existent.`
      case 'overlapping_period':
        return `Există deja un pontaj cu o perioadă care se suprapune${store}. Verificați pontajele existente.`
      default:
        return `Există deja un pontaj similar${store}.`
    }
  }
}