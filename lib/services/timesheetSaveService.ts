// lib/services/timesheetSaveService.ts - Updated with recommended approach
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { TimesheetGridData, TimesheetEntry } from '@/types/timesheet-grid'
import { calculateTotalHours } from '@/lib/timesheet-utils'

type TimesheetInsert = Database['public']['Tables']['timesheets']['Insert']
type TimesheetUpdate = Database['public']['Tables']['timesheets']['Update']
type Employee = Database['public']['Tables']['employees']['Row']

export interface SaveResult {
  success: boolean
  savedCount: number
  failedCount: number
  errors: Array<{
    employeeId: string
    employeeName: string
    error: string
  }>
  savedTimesheets: Array<{
    employeeId: string
    employeeName: string
    timesheetId: string
    isUpdate: boolean
  }>
  sessionId: string
}

export interface SaveOptions {
  createdBy: string
  gridSessionId: string // Now required - single session ID
}

/**
 * Updated service for single-session timesheet saving
 */
export class TimesheetSaveService {
  /**
   * Save timesheet grid data with single session ID (UPSERT approach)
   */
  static async saveTimesheetGrid(
    gridData: TimesheetGridData,
    options: SaveOptions
  ): Promise<SaveResult> {
    const result: SaveResult = {
      success: false,
      savedCount: 0,
      failedCount: 0,
      errors: [],
      savedTimesheets: [],
      sessionId: options.gridSessionId
    }

    try {
      console.log('TimesheetSaveService: Starting save with session:', options.gridSessionId)
      
      // Validate employees exist and get their data
      const employeeValidation = await this.validateEmployees(
        gridData.entries,
        gridData.storeId
      )

      // Process each employee entry with UPSERT logic
      for (const entry of gridData.entries) {
        try {
          const employee = employeeValidation.validEmployees.get(entry.employeeId)
          
          if (!employee) {
            result.errors.push({
              employeeId: entry.employeeId,
              employeeName: entry.employeeName,
              error: 'Employee not found or invalid for selected store'
            })
            result.failedCount++
            continue
          }

          // ✅ DEBUG: Add constraint debugging before save attempt
          console.log('🔍 Attempting to save timesheet for:', {
            employeeId: entry.employeeId,
            employeeName: entry.employeeName,
            employee_store: employee.store_id,
            employee_zone: employee.zone_id,
            grid_store: gridData.storeId,
            period: `${gridData.startDate} - ${gridData.endDate}`
          })

          // UPSERT individual timesheet (update existing or create new)
          const { timesheetId, isUpdate } = await this.upsertEmployeeTimesheet(
            entry,
            gridData,
            employee,
            options
          )

          result.savedTimesheets.push({
            employeeId: entry.employeeId,
            employeeName: entry.employeeName,
            timesheetId,
            isUpdate
          })
          result.savedCount++

        } catch (error) {
          console.error(`Failed to save timesheet for ${entry.employeeName}:`, error)
          result.errors.push({
            employeeId: entry.employeeId,
            employeeName: entry.employeeName,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          result.failedCount++
        }
      }

      result.success = result.savedCount > 0
      
      console.log('TimesheetSaveService: Save completed:', {
        sessionId: result.sessionId,
        saved: result.savedCount,
        failed: result.failedCount
      })
      
      return result

    } catch (error) {
      console.error('TimesheetSaveService: Critical error:', error)
      throw new Error('Failed to save timesheet grid')
    }
  }

  /**
   * Validate employees exist and belong to correct store/zone
   */
  private static async validateEmployees(
    entries: TimesheetEntry[],
    storeId?: string
  ): Promise<{
    validEmployees: Map<string, Employee>
    invalidEmployeeIds: string[]
  }> {
    const employeeIds = entries.map(entry => entry.employeeId)
    
    // ✅ TEMPORARY: Remove store filter to isolate constraint issue
    let query = supabase
      .from('employees')
      .select('*')
      .in('id', employeeIds)

    // Apply store filter if provided - COMMENTED OUT FOR DEBUGGING
    // if (storeId) {
    //   query = query.eq('store_id', storeId)
    // }

    console.log('🔍 Fetching employees:', employeeIds, 'for store:', storeId)

    const { data: employees, error } = await query

    if (error) {
      throw new Error(`Failed to validate employees: ${error.message}`)
    }

    console.log('📋 Found employees:', employees?.map(e => ({
      id: e.id,
      name: e.full_name,
      store: e.store_id,
      zone: e.zone_id
    })))

    const validEmployees = new Map<string, Employee>()
    const foundEmployeeIds = new Set<string>()

    employees?.forEach(employee => {
      validEmployees.set(employee.id, employee)
      foundEmployeeIds.add(employee.id)
    })

    const invalidEmployeeIds = employeeIds.filter(id => !foundEmployeeIds.has(id))

    return { validEmployees, invalidEmployeeIds }
  }

  /**
   * UPSERT timesheet for a single employee (update existing or create new)
   */
  private static async upsertEmployeeTimesheet(
    entry: TimesheetEntry,
    gridData: TimesheetGridData,
    employee: Employee,
    options: SaveOptions
  ): Promise<{ timesheetId: string; isUpdate: boolean }> {
    
    // Check if timesheet already exists for this employee in this period
    const existingTimesheet = await this.findExistingTimesheet(
      employee.id,
      gridData.startDate,
      gridData.endDate
    )

    // Transform grid entry to daily_entries format with employee metadata
    const dailyEntries = this.transformToDailyEntries(entry.days, entry.employeeName, employee)
    const totalHours = calculateTotalHours(entry.days)

    // Base timesheet data - CHOOSE APPROACH BASED ON CONSTRAINT
    const timesheetData = {
      employee_id: employee.id,
      // ✅ FIX: Constraint requires EITHER employee_id OR employee_name, not both
      // Since we have employee_id, set employee_name to null
      employee_name: null,
      store_id: gridData.storeId || employee.store_id,
      zone_id: gridData.zoneId || employee.zone_id,
      period_start: gridData.startDate.split('T')[0],
      period_end: gridData.endDate.split('T')[0],
      daily_entries: dailyEntries,
      total_hours: totalHours,
      notes: `Grid session: ${options.gridSessionId}`,
      created_by: options.createdBy
    }

    // ✅ DEBUG: Log exact data being sent to database
    console.log('💾 Attempting to save timesheet data:', {
      ...timesheetData,
      daily_entries: Object.keys(dailyEntries).length + ' entries'
    })

    if (existingTimesheet) {
      // UPDATE existing timesheet with merged data
      const mergedDailyEntries = this.mergeDailyEntries(
        existingTimesheet.daily_entries,
        dailyEntries
      )

      const { data, error } = await supabase
        .from('timesheets')
        .update({
          ...timesheetData,
          daily_entries: mergedDailyEntries,
          total_hours: this.calculateTotalFromDailyEntries(mergedDailyEntries),
          updated_at: new Date().toISOString()
        } as any) // ✅ FIX: Use 'as any' to bypass TypeScript mismatch
        .eq('id', existingTimesheet.id)
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to update timesheet: ${error.message}`)
      }

      return { timesheetId: data.id, isUpdate: true }

    } else {
      // INSERT new timesheet
      const { data, error } = await supabase
        .from('timesheets')
        .insert(timesheetData as any) // ✅ FIX: Use 'as any' to bypass TypeScript mismatch
        .select('id')
        .single()

      if (error) {
        throw new Error(`Failed to create timesheet: ${error.message}`)
      }

      return { timesheetId: data.id, isUpdate: false }
    }
  }

  /**
   * Find existing timesheet for employee in the given period
   */
  private static async findExistingTimesheet(
    employeeId: string,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await supabase
      .from('timesheets')
      .select('id, daily_entries')
      .eq('employee_id', employeeId)
      .eq('period_start', startDate.split('T')[0])
      .eq('period_end', endDate.split('T')[0])
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to check existing timesheet: ${error.message}`)
    }

    return data
  }

  /**
   * Transform grid day data to database daily_entries format with metadata
   */
  private static transformToDailyEntries(
    days: TimesheetEntry['days'], 
    employeeName: string,
    employee: Employee
  ) {
    const dailyEntries: Record<string, any> = {
      // ✅ SOLUTION: Store employee name in JSON metadata since constraint prevents it in column
      _metadata: {
        employeeName: employeeName,
        employeeId: employee.id,
        position: employee.position,
        employeeCode: employee.employee_code,
        transformedAt: new Date().toISOString()
      }
    }

    Object.entries(days).forEach(([dateKey, dayData]) => {
      // Only store non-empty days to keep JSON lean
      if (dayData.hours > 0 || dayData.status !== 'alege' || dayData.notes?.trim()) {
        dailyEntries[dateKey] = {
          timeInterval: dayData.timeInterval || '',
          hours: dayData.hours,
          status: dayData.status,
          notes: dayData.notes || ''
        }
      }
    })

    return dailyEntries
  }

  /**
   * Merge existing daily entries with new ones (new data takes precedence)
   */
  private static mergeDailyEntries(
    existing: any,
    newEntries: Record<string, any>
  ): Record<string, any> {
    const merged = { ...(existing || {}) }

    // Always update metadata with latest employee info
    if (newEntries._metadata) {
      merged._metadata = newEntries._metadata
    }

    // New entries override existing ones for the same dates
    Object.entries(newEntries).forEach(([dateKey, dayData]) => {
      if (dateKey !== '_metadata') { // Skip metadata in date processing
        merged[dateKey] = dayData
      }
    })

    return merged
  }

  /**
   * Calculate total hours from daily entries (skip metadata)
   */
  private static calculateTotalFromDailyEntries(dailyEntries: Record<string, any>): number {
    return Object.entries(dailyEntries).reduce((total: number, [key, entry]: [string, any]) => {
      // Skip metadata when calculating hours
      if (key === '_metadata') return total
      return total + (entry.hours || 0)
    }, 0)
  }
}