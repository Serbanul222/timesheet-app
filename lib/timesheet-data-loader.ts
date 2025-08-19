// lib/timesheet-data-loader.ts - NEW FILE: Proper data loading for edit mode
'use client'

import { supabase } from '@/lib/supabase/client'
import { type TimesheetGridData, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, formatDateLocal } from '@/lib/timesheet-utils'

interface LoadTimesheetForEditOptions {
  timesheetId: string
  includeHistoricalEmployees?: boolean
}

/**
 * Load timesheet data specifically for edit mode with proper data transformation
 */
export class TimesheetDataLoader {
  
  /**
   * Load timesheet data and transform it properly for the grid
   */
  static async loadTimesheetForEdit(options: LoadTimesheetForEditOptions): Promise<TimesheetGridData | null> {
    try {
      console.log('🔍 Loading timesheet for edit mode:', options.timesheetId)
      
      // Step 1: Load the timesheet with all related data
      const { data: timesheet, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          store:stores(id, name, zone_id),
          zone:zones(id, name)
        `)
        .eq('id', options.timesheetId)
        .single()

      if (error) {
        console.error('❌ Failed to load timesheet:', error)
        throw error
      }

      if (!timesheet) {
        console.error('❌ Timesheet not found')
        return null
      }

      console.log('✅ Timesheet loaded:', {
        id: timesheet.id,
        period: `${timesheet.period_start} to ${timesheet.period_end}`,
        store: timesheet.store?.name,
        hasData: !!timesheet.daily_entries
      })

      // Step 2: Extract and validate daily_entries
      const dailyEntries = timesheet.daily_entries as any
      if (!dailyEntries || typeof dailyEntries !== 'object') {
        console.warn('⚠️ No daily entries found or invalid format')
        return this.createEmptyGrid(timesheet)
      }

      // Step 3: Parse the data structure
      const { employees, dateData } = this.parseDailyEntries(dailyEntries)
      
      if (employees.length === 0) {
        console.warn('⚠️ No employees found in timesheet data')
        return this.createEmptyGrid(timesheet)
      }

      console.log('📊 Parsed timesheet data:', {
        employeeCount: employees.length,
        employees: employees.map(emp => emp.name),
        dateKeys: Object.keys(dateData).slice(0, 5)
      })

      // Step 4: Generate date range
      const dateRange = generateDateRange(
        new Date(timesheet.period_start),
        new Date(timesheet.period_end)
      )

      // Step 5: Transform to grid format
      const gridEntries = employees.map(employee => {
        const days: Record<string, any> = {}
        
        dateRange.forEach(date => {
          const dateKey = formatDateLocal(date)
          const dayData = dateData[dateKey]?.[employee.id] || {}
          
          // ✅ CRITICAL FIX: Preserve ALL original data structure
          days[dateKey] = {
            timeInterval: dayData.timeInterval || dayData.hours || '',
            startTime: dayData.startTime || '',
            endTime: dayData.endTime || '',
            hours: this.parseHours(dayData),
            status: (dayData.status as DayStatus) || 'alege',
            notes: dayData.notes || ''
          }
        })

        return {
          employeeId: employee.id,
          employeeName: employee.name,
          position: employee.position || 'Staff',
          days
        }
      })

      const gridData: TimesheetGridData = {
        id: timesheet.id,
        storeId: timesheet.store_id,
        zoneId: timesheet.zone_id,
        startDate: new Date(timesheet.period_start).toISOString(),
        endDate: new Date(timesheet.period_end).toISOString(),
        entries: gridEntries,
        createdAt: timesheet.created_at,
        updatedAt: new Date().toISOString()
      }

      console.log('✅ Grid data prepared for edit:', {
        entries: gridData.entries.length,
        sampleEntry: gridData.entries[0]?.days[Object.keys(gridData.entries[0]?.days || {})[0]]
      })

      return gridData

    } catch (error) {
      console.error('❌ TimesheetDataLoader error:', error)
      throw error
    }
  }

  /**
   * Parse daily_entries with support for multiple data formats
   */
  private static parseDailyEntries(dailyEntries: any): {
    employees: Array<{ id: string; name: string; position?: string }>
    dateData: Record<string, Record<string, any>>
  } {
    // Format 1: New format with _employees metadata
    if (dailyEntries._employees) {
      console.log('📝 Using new format with _employees metadata')
      
      const employees = Object.entries(dailyEntries._employees).map(([id, data]: [string, any]) => ({
        id,
        name: data.name || data.full_name || 'Unknown Employee',
        position: data.position || 'Staff'
      }))

      const dateData: Record<string, Record<string, any>> = {}
      
      // Process each date
      Object.entries(dailyEntries).forEach(([key, value]) => {
        if (key.startsWith('_')) return // Skip metadata
        
        if (key.match(/^\d{4}-\d{2}-\d{2}$/)) { // Date format YYYY-MM-DD
          dateData[key] = value as Record<string, any>
        }
      })

      return { employees, dateData }
    }

    // Format 2: Legacy format with employees as top-level keys
    console.log('📝 Using legacy format with employees as top-level keys')
    
    const employees: Array<{ id: string; name: string; position?: string }> = []
    const dateData: Record<string, Record<string, any>> = {}

    Object.entries(dailyEntries).forEach(([employeeId, employeeData]: [string, any]) => {
      if (typeof employeeData === 'object' && employeeData.name) {
        employees.push({
          id: employeeId,
          name: employeeData.name,
          position: employeeData.position || 'Staff'
        })

        // Extract days data
        if (employeeData.days) {
          Object.entries(employeeData.days).forEach(([dateKey, dayData]) => {
            if (!dateData[dateKey]) dateData[dateKey] = {}
            dateData[dateKey][employeeId] = dayData
          })
        }
      }
    })

    return { employees, dateData }
  }

  /**
   * Parse hours from various formats
   */
  private static parseHours(dayData: any): number {
    if (typeof dayData.hours === 'number') {
      return dayData.hours
    }

    if (typeof dayData.hours === 'string' && dayData.hours.includes('-')) {
      // Parse "10-18" format
      const [start, end] = dayData.hours.split('-').map(h => parseInt(h.trim(), 10))
      if (!isNaN(start) && !isNaN(end)) {
        return Math.max(0, end - start)
      }
    }

    if (dayData.timeInterval && typeof dayData.timeInterval === 'string') {
      // Parse timeInterval like "10-18"
      const match = dayData.timeInterval.match(/(\d{1,2}):?(\d{0,2})-(\d{1,2}):?(\d{0,2})/)
      if (match) {
        const [, startH, startM, endH, endM] = match
        const startMinutes = parseInt(startH) * 60 + (parseInt(startM) || 0)
        const endMinutes = parseInt(endH) * 60 + (parseInt(endM) || 0)
        let diffMinutes = endMinutes - startMinutes
        if (diffMinutes < 0) diffMinutes += 24 * 60 // Handle overnight shifts
        return Math.round((diffMinutes / 60) * 100) / 100
      }
    }

    return 0
  }

  /**
   * Create empty grid for timesheet without data
   */
  private static createEmptyGrid(timesheet: any): TimesheetGridData {
    return {
      id: timesheet.id,
      storeId: timesheet.store_id,
      zoneId: timesheet.zone_id,
      startDate: new Date(timesheet.period_start).toISOString(),
      endDate: new Date(timesheet.period_end).toISOString(),
      entries: [],
      createdAt: timesheet.created_at,
      updatedAt: new Date().toISOString()
    }
  }

  /**
   * Validate grid data integrity
   */
  static validateGridData(gridData: TimesheetGridData): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!gridData.storeId) {
      errors.push('Missing store ID')
    }

    if (gridData.entries.length === 0) {
      warnings.push('No employee entries found')
    }

    gridData.entries.forEach((entry, index) => {
      if (!entry.employeeId) {
        errors.push(`Entry ${index}: Missing employee ID`)
      }
      if (!entry.employeeName) {
        warnings.push(`Entry ${index}: Missing employee name`)
      }
      
      const daysCount = Object.keys(entry.days || {}).length
      if (daysCount === 0) {
        warnings.push(`${entry.employeeName}: No day data`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}