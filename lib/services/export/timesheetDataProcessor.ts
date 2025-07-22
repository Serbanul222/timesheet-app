// lib/services/export/timesheetDataProcessor.ts
import { TimesheetRow } from '@/types/database'
import { ExportOptions, ProcessedTimesheetData } from '@/types/exports'
import { format, parseISO, isWeekend } from 'date-fns'

/**
 * Processes raw timesheet data for export
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
    
    // Apply filters
    const filteredTimesheets = this.applyFilters(timesheets, options)
    
    // Extract all data
    const employees = this.extractEmployees(filteredTimesheets)
    const stores = this.extractStores(filteredTimesheets, employees)
    const dailyEntries = this.extractDailyEntries(filteredTimesheets, options)
    const summary = this.calculateSummary(filteredTimesheets, employees, dailyEntries)
    
    return {
      summary,
      timesheets: this.formatTimesheets(filteredTimesheets),
      employees,
      stores,
      dailyEntries
    }
  }
  
  /**
   * Apply filters to timesheet data
   */
  private static applyFilters(
    timesheets: TimesheetRow[],
    options: ExportOptions
  ): TimesheetRow[] {
    let filtered = [...timesheets]
    
    // Date range filter
    if (options.dateRange) {
      filtered = filtered.filter(ts => {
        const start = parseISO(ts.period_start)
        const end = parseISO(ts.period_end)
        const filterStart = parseISO(options.dateRange!.startDate)
        const filterEnd = parseISO(options.dateRange!.endDate)
        
        return start >= filterStart && end <= filterEnd
      })
    }
    
    // Store filter
    if (options.storeIds?.length) {
      filtered = filtered.filter(ts => options.storeIds!.includes(ts.store_id))
    }
    
    // Zone filter  
    if (options.zoneIds?.length) {
      filtered = filtered.filter(ts => options.zoneIds!.includes(ts.zone_id))
    }
    
    // Limit rows if specified
    if (options.maxRows) {
      filtered = filtered.slice(0, options.maxRows)
    }
    
    console.log(`🔍 Filtered ${timesheets.length} → ${filtered.length} timesheets`)
    return filtered
  }
  
  /**
   * Extract employee data from timesheets
   */
  private static extractEmployees(timesheets: TimesheetRow[]): ProcessedTimesheetData['employees'] {
    const employeeMap = new Map<string, any>()
    
    timesheets.forEach(timesheet => {
      const dailyEntries = timesheet.daily_entries as any
      if (!dailyEntries || typeof dailyEntries !== 'object') return
      
      const format = this.detectDailyEntriesFormat(dailyEntries)
      
      if (format === 'new' && dailyEntries._employees) {
        // New format: { _employees: { [id]: metadata }, [date]: { [id]: data } }
        Object.entries(dailyEntries._employees).forEach(([empId, empData]: [string, any]) => {
          if (!employeeMap.has(empId)) {
            const totalHours = this.calculateEmployeeTotalHours(empId, dailyEntries)
            const daysWorked = this.calculateEmployeeDaysWorked(empId, dailyEntries)
            
            employeeMap.set(empId, {
              id: empId,
              name: empData.name,
              position: empData.position || 'Staff',
              employeeCode: empData.employee_code,
              storeId: timesheet.store_id,
              storeName: timesheet.store?.name || 'Unknown Store',
              totalHours,
              daysWorked,
              isDelegated: this.isEmployeeDelegated(empData),
              delegationInfo: this.getDelegationInfo(empData)
            })
          }
        })
      } else {
        // Legacy format: { [empId]: { name, days: {...} } }
        Object.entries(dailyEntries).forEach(([empId, empData]: [string, any]) => {
          if (empId.startsWith('_') || !empData?.name) return
          
          if (!employeeMap.has(empId)) {
            const totalHours = this.calculateEmployeeTotalHoursLegacy(empData.days || {})
            const daysWorked = Object.keys(empData.days || {}).length
            
            employeeMap.set(empId, {
              id: empId,
              name: empData.name,
              position: empData.position || 'Staff',
              employeeCode: empData.employee_code,
              storeId: timesheet.store_id,
              storeName: timesheet.store?.name || 'Unknown Store',
              totalHours,
              daysWorked,
              isDelegated: false,
              delegationInfo: undefined
            })
          }
        })
      }
    })
    
    return Array.from(employeeMap.values())
  }
  
  /**
   * Extract store data
   */
  private static extractStores(
    timesheets: TimesheetRow[],
    employees: ProcessedTimesheetData['employees']
  ): ProcessedTimesheetData['stores'] {
    const storeMap = new Map<string, any>()
    
    timesheets.forEach(timesheet => {
      const storeEmployees = employees.filter(emp => emp.storeId === timesheet.store_id)
      const totalHours = storeEmployees.reduce((sum, emp) => sum + emp.totalHours, 0)
      
      if (!storeMap.has(timesheet.store_id)) {
        storeMap.set(timesheet.store_id, {
          id: timesheet.store_id,
          name: timesheet.store?.name || 'Unknown Store',
          zoneId: timesheet.zone_id,
          zoneName: timesheet.zone?.name || 'Unknown Zone',
          employeeCount: storeEmployees.length,
          totalHours,
          timesheetCount: 1
        })
      } else {
        const store = storeMap.get(timesheet.store_id)
        store.timesheetCount++
      }
    })
    
    return Array.from(storeMap.values())
  }
  
  /**
   * Extract daily entries for detailed view
   */
  private static extractDailyEntries(
    timesheets: TimesheetRow[],
    options: ExportOptions
  ): ProcessedTimesheetData['dailyEntries'] {
    const entries: ProcessedTimesheetData['dailyEntries'] = []
    
    timesheets.forEach(timesheet => {
      const dailyEntries = timesheet.daily_entries as any
      if (!dailyEntries || typeof dailyEntries !== 'object') return
      
      const format = this.detectDailyEntriesFormat(dailyEntries)
      
      if (format === 'new') {
        this.processDailyEntriesNew(timesheet, dailyEntries, entries, options)
      } else {
        this.processDailyEntriesLegacy(timesheet, dailyEntries, entries, options)
      }
    })
    
    // Sort by date and employee name
    entries.sort((a, b) => {
      const dateComparison = a.date.localeCompare(b.date)
      return dateComparison !== 0 ? dateComparison : a.employeeName.localeCompare(b.employeeName)
    })
    
    return entries
  }
  
  /**
   * Process new format daily entries
   */
  private static processDailyEntriesNew(
    timesheet: TimesheetRow,
    dailyEntries: any,
    entries: ProcessedTimesheetData['dailyEntries'],
    options: ExportOptions
  ): void {
    Object.keys(dailyEntries).forEach(dateKey => {
      if (dateKey.startsWith('_')) return // Skip metadata
      
      const dateEntry = dailyEntries[dateKey]
      if (!dateEntry || typeof dateEntry !== 'object') return
      
      Object.entries(dateEntry).forEach(([empId, dayData]: [string, any]) => {
        if (!dayData || typeof dayData !== 'object') return
        
        const empMetadata = dailyEntries._employees?.[empId]
        const hasData = dayData.hours > 0 || dayData.status !== 'alege' || dayData.notes?.trim()
        
        if (!options.includeEmptyDays && !hasData) return
        
        entries.push({
          timesheetId: timesheet.id,
          employeeId: empId,
          employeeName: empMetadata?.name || dayData.employee_name || 'Unknown',
          position: empMetadata?.position || dayData.position || 'Staff',
          storeId: timesheet.store_id,
          storeName: timesheet.store?.name || 'Unknown Store',
          date: dateKey,
          dayOfWeek: format(parseISO(dateKey), 'EEEE'),
          timeInterval: dayData.timeInterval || '',
          hours: dayData.hours || 0,
          status: dayData.status || 'alege',
          statusDescription: this.getStatusDescription(dayData.status || 'alege'),
          notes: options.includeNotes ? (dayData.notes || '') : undefined,
          isWeekend: isWeekend(parseISO(dateKey)),
          isDelegated: this.isEmployeeDelegated(empMetadata)
        })
      })
    })
  }
  
  /**
   * Process legacy format daily entries
   */
  private static processDailyEntriesLegacy(
    timesheet: TimesheetRow,
    dailyEntries: any,
    entries: ProcessedTimesheetData['dailyEntries'],
    options: ExportOptions
  ): void {
    Object.entries(dailyEntries).forEach(([empId, empData]: [string, any]) => {
      if (empId.startsWith('_') || !empData?.name || !empData.days) return
      
      Object.entries(empData.days).forEach(([dateKey, dayData]: [string, any]) => {
        if (!dayData || typeof dayData !== 'object') return
        
        const hasData = dayData.hours > 0 || dayData.status !== 'alege' || dayData.notes?.trim()
        if (!options.includeEmptyDays && !hasData) return
        
        entries.push({
          timesheetId: timesheet.id,
          employeeId: empId,
          employeeName: empData.name,
          position: empData.position || 'Staff',
          storeId: timesheet.store_id,
          storeName: timesheet.store?.name || 'Unknown Store',
          date: dateKey,
          dayOfWeek: format(parseISO(dateKey), 'EEEE'),
          timeInterval: dayData.timeInterval || '',
          hours: dayData.hours || 0,
          status: dayData.status || 'alege',
          statusDescription: this.getStatusDescription(dayData.status || 'alege'),
          notes: options.includeNotes ? (dayData.notes || '') : undefined,
          isWeekend: isWeekend(parseISO(dateKey)),
          isDelegated: false
        })
      })
    })
  }
  
  /**
   * Calculate summary statistics
   */
  private static calculateSummary(
    timesheets: TimesheetRow[],
    employees: ProcessedTimesheetData['employees'],
    dailyEntries: ProcessedTimesheetData['dailyEntries']
  ): ProcessedTimesheetData['summary'] {
    const totalHours = employees.reduce((sum, emp) => sum + emp.totalHours, 0)
    const dates = dailyEntries.map(entry => entry.date).sort()
    
    return {
      totalHours,
      totalEmployees: employees.length,
      totalTimesheets: timesheets.length,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || ''
      },
      exportedAt: new Date().toISOString()
    }
  }
  
  /**
   * Format timesheet records for export
   */
  private static formatTimesheets(timesheets: TimesheetRow[]): ProcessedTimesheetData['timesheets'] {
    return timesheets.map(ts => ({
      id: ts.id,
      gridTitle: ts.grid_title || `Timesheet ${format(parseISO(ts.period_start), 'MMM yyyy')}`,
      storeId: ts.store_id,
      storeName: ts.store?.name || 'Unknown Store',
      zoneId: ts.zone_id,
      zoneName: ts.zone?.name || 'Unknown Zone',
      periodStart: ts.period_start,
      periodEnd: ts.period_end,
      totalHours: ts.total_hours || 0,
      employeeCount: ts.employee_count || 0,
      createdAt: ts.created_at,
      updatedAt: ts.updated_at
    }))
  }
  
  // Helper methods
  private static detectDailyEntriesFormat(dailyEntries: any): 'new' | 'legacy' {
    return dailyEntries._employees ? 'new' : 'legacy'
  }
  
  private static calculateEmployeeTotalHours(empId: string, dailyEntries: any): number {
    let total = 0
    Object.keys(dailyEntries).forEach(dateKey => {
      if (dateKey.startsWith('_')) return
      const dayData = dailyEntries[dateKey]?.[empId]
      if (dayData?.hours) total += dayData.hours
    })
    return total
  }
  
  private static calculateEmployeeDaysWorked(empId: string, dailyEntries: any): number {
    let days = 0
    Object.keys(dailyEntries).forEach(dateKey => {
      if (dateKey.startsWith('_')) return
      const dayData = dailyEntries[dateKey]?.[empId]
      if (dayData?.hours > 0) days++
    })
    return days
  }
  
  private static calculateEmployeeTotalHoursLegacy(days: any): number {
    return Object.values(days).reduce((total: number, day: any) => {
      return total + (day?.hours || 0)
    }, 0)
  }
  
  private static isEmployeeDelegated(empData: any): boolean {
    return empData?.isDelegated || empData?.delegation !== undefined
  }
  
  private static getDelegationInfo(empData: any): any {
    if (!empData?.delegation) return undefined
    return {
      fromStore: empData.delegation.from_store_name,
      toStore: empData.delegation.to_store_name,
      validUntil: empData.delegation.valid_until
    }
  }
  
  private static getStatusDescription(status: string): string {
    const statusMap: Record<string, string> = {
      'alege': 'To be selected',
      'CO': 'Time Off',
      'CM': 'Medical Leave',
      'dispensa': 'Dispensation',
      'OFF': 'Day Off'
    }
    return statusMap[status] || status
  }
}