// lib/services/export/timesheetDataProcessor.ts - Fixed for your legacy format
import { TimesheetRow } from '@/types/database'
import { ExportOptions, ProcessedTimesheetData } from '@/types/exports'
import { format, parseISO, isWeekend } from 'date-fns'

/**
 * Processes raw timesheet data for export
 * Fixed to properly handle your legacy format: { empId: { name, position, days: { date: {...} } } }
 */
export class TimesheetDataProcessor {
  
  /**
   * Main processing function - converts database timesheets to export format
   */
  static processTimesheets(
    timesheets: TimesheetRow[],
    options: ExportOptions = {}
  ): ProcessedTimesheetData {
    console.log(`📊 Processing ${timesheets.length} timesheets for export`)
    console.log('📋 Sample timesheet structure:', timesheets[0]?.daily_entries)
    
    // Apply filters - but be more lenient with date matching
    const filteredTimesheets = this.applyFilters(timesheets, options)
    console.log(`🔍 After filtering: ${filteredTimesheets.length} timesheets`)
    
    // Extract all data with detailed logging
    const employees = this.extractEmployees(filteredTimesheets)
    console.log(`👥 Extracted ${employees.length} employees:`, employees.map(e => e.name))
    
    const stores = this.extractStores(filteredTimesheets, employees)
    console.log(`🏪 Extracted ${stores.length} stores`)
    
    const dailyEntries = this.extractDailyEntries(filteredTimesheets, options)
    console.log(`📅 Extracted ${dailyEntries.length} daily entries`)
    
    const summary = this.calculateSummary(filteredTimesheets, employees, dailyEntries)
    
    const result = {
      summary,
      timesheets: this.formatTimesheets(filteredTimesheets),
      employees,
      stores,
      dailyEntries
    }
    
    console.log('✅ Final processed data:', {
      timesheets: result.timesheets.length,
      employees: result.employees.length,
      stores: result.stores.length,
      dailyEntries: result.dailyEntries.length,
      totalHours: result.summary.totalHours
    })
    
    return result
  }
  
  /**
   * Apply filters - FIXED to be more lenient with date matching
   */
  private static applyFilters(
    timesheets: TimesheetRow[],
    options: ExportOptions
  ): TimesheetRow[] {
    let filtered = [...timesheets]
    console.log('🔧 Applying filters...')
    
    // For your case, let's be more lenient with date filtering
    // Since you might have individual daily entries that fall within the range
    if (options.dateRange) {
      const { startDate, endDate } = options.dateRange
      console.log(`📅 Filtering by date range: ${startDate} to ${endDate}`)
      
      filtered = filtered.filter(ts => {
        // Check if timesheet has ANY daily entries within the date range
        const dailyEntries = ts.daily_entries as any
        if (!dailyEntries || typeof dailyEntries !== 'object') {
          console.log(`❌ Timesheet ${ts.id} has no daily entries`)
          return false
        }
        
        let hasValidDates = false
        
        // Look through all employees and their days
        Object.values(dailyEntries).forEach((empData: any) => {
          if (empData?.days) {
            Object.keys(empData.days).forEach(dateKey => {
              try {
                const entryDate = parseISO(dateKey)
                const filterStart = parseISO(startDate)
                const filterEnd = parseISO(endDate)
                
                if (entryDate >= filterStart && entryDate <= filterEnd) {
                  hasValidDates = true
                  console.log(`✅ Found valid date ${dateKey} in timesheet ${ts.id}`)
                }
              } catch (error) {
                console.error('Date parsing error:', error, dateKey)
              }
            })
          }
        })
        
        return hasValidDates
      })
      
      console.log(`📅 Date filter result: ${filtered.length}/${timesheets.length} timesheets`)
    }
    
    return filtered
  }
  
  /**
   * Extract employee data - FIXED for your legacy format
   */
  private static extractEmployees(timesheets: TimesheetRow[]): ProcessedTimesheetData['employees'] {
    const employeeMap = new Map<string, any>()
    console.log('👥 Extracting employees from timesheets...')
    
    timesheets.forEach((timesheet, index) => {
      console.log(`📋 Processing timesheet ${index + 1}/${timesheets.length}: ${timesheet.id}`)
      
      const dailyEntries = timesheet.daily_entries as any
      if (!dailyEntries || typeof dailyEntries !== 'object') {
        console.log(`⚠️ Timesheet ${timesheet.id} has no daily_entries`)
        return
      }
      
      console.log(`📊 Daily entries keys:`, Object.keys(dailyEntries))
      
      // Process legacy format: { empId: { name, position, days: {...} } }
      Object.entries(dailyEntries).forEach(([empId, empData]: [string, any]) => {
        console.log(`👤 Processing employee entry: ${empId}`, empData)
        
        // Skip invalid entries
        if (!empData || typeof empData !== 'object' || !empData.name) {
          console.log(`⚠️ Skipping invalid employee: ${empId}`)
          return
        }
        
        if (!employeeMap.has(empId)) {
          const days = empData.days || {}
          const totalHours = this.calculateEmployeeTotalHoursLegacy(days)
          const daysWorked = Object.keys(days).filter(dateKey => {
            const dayData = days[dateKey]
            return dayData && dayData.hours > 0
          }).length
          
          const employee = {
            id: empId,
            name: empData.name,
            position: empData.position || 'Staff',
            employeeCode: empId, // Use UUID as employee code
            storeId: timesheet.store_id,
            storeName: this.getStoreName(timesheet),
            totalHours,
            daysWorked,
            isDelegated: false,
            delegationInfo: undefined
          }
          
          employeeMap.set(empId, employee)
          console.log(`✅ Added employee: ${employee.name} (${empId}) - ${totalHours}h over ${daysWorked} days`)
          console.log(`📊 Employee days:`, Object.keys(days))
        }
      })
    })
    
    const employees = Array.from(employeeMap.values())
    console.log(`👥 Final employee extraction: ${employees.length} employees`)
    return employees
  }
  
  /**
   * Extract daily entries - FIXED for your legacy format
   */
  private static extractDailyEntries(
    timesheets: TimesheetRow[],
    options: ExportOptions
  ): ProcessedTimesheetData['dailyEntries'] {
    const entries: ProcessedTimesheetData['dailyEntries'] = []
    console.log('📅 Extracting daily entries...')
    
    timesheets.forEach((timesheet, tsIndex) => {
      console.log(`📋 Processing daily entries for timesheet ${tsIndex + 1}/${timesheets.length}`)
      
      const dailyEntries = timesheet.daily_entries as any
      if (!dailyEntries || typeof dailyEntries !== 'object') {
        console.log(`⚠️ No daily entries found for timesheet ${timesheet.id}`)
        return
      }
      
      // Process legacy format
      Object.entries(dailyEntries).forEach(([empId, empData]: [string, any]) => {
        if (!empData?.name || !empData.days) {
          console.log(`⚠️ Skipping invalid employee entry: ${empId}`)
          return
        }
        
        console.log(`👤 Processing daily entries for employee ${empData.name} (${empId})`)
        console.log(`📊 Employee has ${Object.keys(empData.days).length} day entries`)
        
        Object.entries(empData.days).forEach(([dateKey, dayData]: [string, any]) => {
          if (!dayData || typeof dayData !== 'object') {
            console.log(`⚠️ Invalid day data for ${empId} on ${dateKey}`)
            return
          }
          
          console.log(`📅 Processing ${dateKey}:`, dayData)
          
          // Check if this entry falls within our date filter
          if (options.dateRange) {
            try {
              const entryDate = parseISO(dateKey)
              const filterStart = parseISO(options.dateRange.startDate)
              const filterEnd = parseISO(options.dateRange.endDate)
              
              if (entryDate < filterStart || entryDate > filterEnd) {
                console.log(`⚠️ Date ${dateKey} outside filter range, skipping`)
                return
              }
            } catch (error) {
              console.error('Date validation error:', error)
              return
            }
          }
          
          const hasData = (dayData.hours && dayData.hours > 0) || 
                         (dayData.status && dayData.status !== 'alege') || 
                         (dayData.notes && dayData.notes.trim())
          
          if (!options.includeEmptyDays && !hasData) {
            console.log(`📅 Skipping empty day: ${dateKey}`)
            return
          }
          
          const entry = {
            timesheetId: timesheet.id,
            employeeId: empId,
            employeeName: empData.name,
            position: empData.position || 'Staff',
            storeId: timesheet.store_id,
            storeName: this.getStoreName(timesheet),
            date: dateKey,
            dayOfWeek: format(parseISO(dateKey), 'EEEE'),
            timeInterval: dayData.timeInterval || '',
            hours: dayData.hours || 0,
            status: dayData.status || 'alege',
            statusDescription: this.getStatusDescription(dayData.status || 'alege'),
            notes: options.includeNotes ? (dayData.notes || '') : undefined,
            isWeekend: isWeekend(parseISO(dateKey)),
            isDelegated: false
          }
          
          entries.push(entry)
          console.log(`✅ Added entry: ${entry.employeeName} on ${dateKey} - ${entry.hours}h (${entry.timeInterval})`)
        })
      })
    })
    
    console.log(`📅 Extracted total of ${entries.length} daily entries`)
    return entries
  }
  
  /**
   * Extract store data
   */
  private static extractStores(
    timesheets: TimesheetRow[],
    employees: ProcessedTimesheetData['employees']
  ): ProcessedTimesheetData['stores'] {
    const storeMap = new Map<string, any>()
    console.log('🏪 Extracting store data...')
    
    timesheets.forEach(timesheet => {
      const storeEmployees = employees.filter(emp => emp.storeId === timesheet.store_id)
      const totalHours = storeEmployees.reduce((sum, emp) => sum + emp.totalHours, 0)
      
      if (!storeMap.has(timesheet.store_id)) {
        const store = {
          id: timesheet.store_id,
          name: this.getStoreName(timesheet),
          zoneId: timesheet.zone_id,
          zoneName: this.getZoneName(timesheet),
          employeeCount: storeEmployees.length,
          totalHours,
          timesheetCount: 1
        }
        
        storeMap.set(timesheet.store_id, store)
        console.log(`🏪 Added store: ${store.name} - ${store.employeeCount} employees, ${totalHours}h`)
      } else {
        const store = storeMap.get(timesheet.store_id)
        store.timesheetCount++
      }
    })
    
    return Array.from(storeMap.values())
  }
  
  /**
   * Calculate summary statistics
   */
  private static calculateSummary(
    timesheets: TimesheetRow[],
    employees: ProcessedTimesheetData['employees'],
    dailyEntries: ProcessedTimesheetData['dailyEntries']
  ): ProcessedTimesheetData['summary'] {
    console.log('📊 Calculating summary statistics...')
    
    const totalHours = employees.reduce((sum, emp) => sum + emp.totalHours, 0)
    const dates = dailyEntries.map(entry => entry.date).sort()
    
    const summary = {
      totalHours,
      totalEmployees: employees.length,
      totalTimesheets: timesheets.length,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || ''
      },
      exportedAt: new Date().toISOString()
    }
    
    console.log('📊 Summary:', summary)
    return summary
  }
  
  /**
   * Format timesheet records for export
   */
  private static formatTimesheets(timesheets: TimesheetRow[]): ProcessedTimesheetData['timesheets'] {
    return timesheets.map(ts => ({
      id: ts.id,
      gridTitle: ts.grid_title || `Timesheet ${format(parseISO(ts.period_start), 'MMM yyyy')}`,
      storeId: ts.store_id,
      storeName: this.getStoreName(ts),
      zoneId: ts.zone_id,
      zoneName: this.getZoneName(ts),
      periodStart: ts.period_start,
      periodEnd: ts.period_end,
      totalHours: ts.total_hours || 0,
      employeeCount: ts.employee_count || 0,
      createdAt: ts.created_at,
      updatedAt: ts.updated_at
    }))
  }
  
  // Helper methods
  private static calculateEmployeeTotalHoursLegacy(days: any): number {
    let total = 0
    Object.values(days).forEach((day: any) => {
      if (day?.hours && typeof day.hours === 'number') {
        total += day.hours
      }
    })
    console.log(`📊 Calculated legacy total hours: ${total}`)
    return total
  }
  
  private static getStatusDescription(status: string): string {
    const statusMap: Record<string, string> = {
      'alege': 'Alege',
      'CO': 'Concediu Odihnă',
      'CM': 'Concediu Medical',
      'dispensa': 'Dispensă',
      'OFF': 'Liber'
    }
    return statusMap[status] || status
  }
  
  private static getStoreName(timesheet: TimesheetRow): string {
    // Handle different possible store data structures
    if (timesheet.store && typeof timesheet.store === 'object' && 'name' in timesheet.store) {
      return (timesheet.store as { name: string }).name
    }
    return timesheet.store?.toString() || 'Unknown Store'
  }
  
  private static getZoneName(timesheet: TimesheetRow): string {
    // Handle different possible zone data structures
    if (timesheet.zone && typeof timesheet.zone === 'object' && 'name' in timesheet.zone) {
      return (timesheet.zone as { name: string }).name
    }
    return timesheet.zone?.toString() || 'Unknown Zone'
  }
}