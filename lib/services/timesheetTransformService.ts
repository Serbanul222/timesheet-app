// lib/services/timesheetTransformService.ts - New Service
import { TimesheetGridData } from '@/types/timesheet-grid'
import { calculateTotalHours } from '@/lib/timesheet-utils'
import { SaveOptions } from './timesheetSaveService'
import { supabase } from '@/lib/supabase/client'

export class TimesheetTransformService {

  public static async transformGridForDatabase(
    gridData: TimesheetGridData,
    options: SaveOptions,
    validEmployees: Map<string, any>
  ) {
    const totalHours = gridData.entries.reduce((total, entry) => {
      return total + calculateTotalHours(entry.days)
    }, 0)

    const dailyEntries = this.createDailyEntriesWithEmployeeIds(gridData, validEmployees)
    const employeeCount = gridData.entries.length
    const gridTitle = options.gridTitle || this.generateGridTitle(gridData)

    if (!gridData.zoneId && gridData.storeId) {
      const { data: store } = await supabase
        .from('stores')
        .select('zone_id')
        .eq('id', gridData.storeId)
        .single()
      
      if (!store) throw new Error('Invalid store ID provided for transformation')
      gridData.zoneId = store.zone_id
    }
    
    return {
      store_id: gridData.storeId,
      zone_id: gridData.zoneId,
      period_start: gridData.startDate.split('T')[0],
      period_end: gridData.endDate.split('T')[0],
      total_hours: totalHours,
      employee_count: employeeCount,
      daily_entries: dailyEntries,
      grid_title: gridTitle,
      notes: `Grid session: ${options.gridSessionId}`,
      created_by: options.createdBy
    }
  }

  private static createDailyEntriesWithEmployeeIds(
    gridData: TimesheetGridData,
    validEmployees: Map<string, any>
  ) {
    const dailyEntries: any = {
      _grid_metadata: {
        version: '2.0',
        sessionId: gridData.id,
        employeeCount: gridData.entries.length,
        createdAt: gridData.createdAt,
        updatedAt: new Date().toISOString(),
        storeId: gridData.storeId,
        zoneId: gridData.zoneId
      },
      _employees: gridData.entries.reduce((acc, entry) => {
        const employee = validEmployees.get(entry.employeeId)
        acc[entry.employeeId] = {
          id: entry.employeeId,
          name: entry.employeeName,
          position: entry.position,
          employee_code: employee?.employee_code,
          original_store_id: employee?.store_id,
          original_zone_id: employee?.zone_id,
          current_store_id: gridData.storeId
        }
        return acc
      }, {} as Record<string, any>)
    }

    const allDates = new Set<string>()
    gridData.entries.forEach(entry => {
      Object.keys(entry.days).forEach(date => allDates.add(date))
    })

    Array.from(allDates).forEach(dateKey => {
      dailyEntries[dateKey] = {}
      
      gridData.entries.forEach(entry => {
        const dayData = entry.days[dateKey]
        if (dayData && (dayData.hours > 0 || dayData.status !== 'alege' || dayData.notes?.trim())) {
          dailyEntries[dateKey][entry.employeeId] = {
            employee_id: entry.employeeId,
            employee_name: entry.employeeName,
            position: entry.position,
            timeInterval: dayData.timeInterval || '',
            hours: dayData.hours,
            status: dayData.status,
            notes: dayData.notes || ''
          }
        }
      })
    })

    return dailyEntries
  }

  private static generateGridTitle(gridData: TimesheetGridData): string {
    const startDate = new Date(gridData.startDate)
    const monthName = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return `${monthName} - ${gridData.entries.length} employees`
  }
}