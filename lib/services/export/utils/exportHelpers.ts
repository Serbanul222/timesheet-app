// lib/services/export/utils/exportHelpers.ts
import { format, parseISO, isValid } from 'date-fns'

/**
 * Utility functions for export operations
 * Think of these as helper methods in a Java utility class
 */
export class ExportHelpers {
  
  /**
   * Format date for display - like Java's DateTimeFormatter
   */
  static formatDate(dateString: string, formatString: string = 'yyyy-MM-dd'): string {
    try {
      const date = parseISO(dateString)
      return isValid(date) ? format(date, formatString) : dateString
    } catch {
      return dateString
    }
  }
  
  /**
   * Format hours with proper decimal places
   */
  static formatHours(hours: number): string {
    return Math.round(hours * 100) / 100 + 'h'
  }
  
  /**
   * Calculate percentage with proper rounding
   */
  static formatPercentage(value: number, total: number): string {
    if (total === 0) return '0%'
    const percentage = Math.round((value / total) * 10000) / 100
    return percentage + '%'
  }
  
  /**
   * Clean filename for cross-platform compatibility
   */
  static sanitizeFilename(filename: string): string {
    // Remove invalid characters and replace with underscores
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase()
  }
  
  /**
   * Convert file size to human readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = Math.round((bytes / Math.pow(1024, i)) * 100) / 100
    
    return size + ' ' + sizes[i]
  }
  
  /**
   * Generate download URL for file buffer
   */
  static createDownloadUrl(buffer: ArrayBuffer, mimeType: string): string {
    const blob = new Blob([buffer], { type: mimeType })
    return URL.createObjectURL(blob)
  }
  
  /**
   * Trigger file download in browser
   */
  static downloadFile(url: string, filename: string): void {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up the URL after download
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  
  /**
   * Estimate export size based on data volume
   */
  static estimateExportSize(
    recordCount: number, 
    format: 'excel' | 'csv'
  ): { size: number; warning?: string } {
    // Rough estimates based on format overhead
    const baseSize = recordCount * 100 // ~100 bytes per record
    
    let multiplier = 1
    switch (format) {
      case 'excel':
        multiplier = 2.5 // Excel has significant overhead
        break
      case 'csv':
        multiplier = 1.2 // CSV is most efficient
        break
    }
    
    const estimatedSize = Math.round(baseSize * multiplier)
    
    const result = { size: estimatedSize }
    
    // Add warnings for large files
    if (estimatedSize > 10 * 1024 * 1024) { // > 10MB
      result.warning = 'Large export detected. This may take several minutes to generate.'
    } else if (estimatedSize > 50 * 1024 * 1024) { // > 50MB
      result.warning = 'Very large export. Consider reducing the date range or applying filters.'
    }
    
    return result
  }
  
  /**
   * Validate export parameters - similar to @Valid in Spring Boot
   */
  static validateExportParams(params: {
    dateRange?: { startDate: string; endDate: string }
    maxRows?: number
    filename?: string
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Date validation
    if (params.dateRange) {
      const { startDate, endDate } = params.dateRange
      
      if (!isValid(parseISO(startDate))) {
        errors.push('Invalid start date format')
      }
      
      if (!isValid(parseISO(endDate))) {
        errors.push('Invalid end date format')
      }
      
      if (parseISO(startDate) > parseISO(endDate)) {
        errors.push('Start date must be before end date')
      }
      
      // Check for reasonable date ranges
      const daysDiff = Math.abs(
        parseISO(endDate).getTime() - parseISO(startDate).getTime()
      ) / (1000 * 60 * 60 * 24)
      
      if (daysDiff > 366) {
        errors.push('Date range cannot exceed 1 year')
      }
    }
    
    // Row limit validation
    if (params.maxRows !== undefined) {
      if (params.maxRows < 1) {
        errors.push('Row limit must be at least 1')
      }
      if (params.maxRows > 50000) {
        errors.push('Row limit cannot exceed 50,000')
      }
    }
    
    // Filename validation
    if (params.filename) {
      const invalidChars = /[<>:"/\\|?*]/
      if (invalidChars.test(params.filename)) {
        errors.push('Filename contains invalid characters: < > : " / \\ | ? *')
      }
      
      if (params.filename.length > 200) {
        errors.push('Filename too long (max 200 characters)')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// lib/services/export/utils/dataTransformers.ts

/**
 * Data transformation utilities for export formats
 * Think of these as data mappers in a typical enterprise application
 */
export class DataTransformers {
  
  /**
   * Transform employee data for different export contexts
   */
  static transformEmployeeData(
    employees: any[], 
    context: 'summary' | 'payroll' | 'detailed'
  ): any[] {
    switch (context) {
      case 'summary':
        return employees.map(emp => ({
          name: emp.name,
          position: emp.position,
          store: emp.storeName,
          totalHours: emp.totalHours,
          daysWorked: emp.daysWorked,
          avgHoursPerDay: emp.daysWorked > 0 
            ? Math.round((emp.totalHours / emp.daysWorked) * 100) / 100 
            : 0,
          isDelegated: emp.isDelegated ? 'Yes' : 'No'
        }))
        
      case 'payroll':
        return employees.map(emp => ({
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.employeeCode || emp.id,
          position: emp.position,
          storeId: emp.storeId,
          storeName: emp.storeName,
          totalRegularHours: emp.totalHours, // Could be split into regular/overtime
          totalOvertimeHours: 0, // Placeholder for overtime calculation
          payPeriodStart: '', // Would be filled from timesheet period
          payPeriodEnd: '',
          status: emp.isDelegated ? 'DELEGATED' : 'REGULAR'
        }))
        
      case 'detailed':
      default:
        return employees // Return as-is for detailed view
    }
  }
  
  /**
   * Transform daily entries for different export needs
   */
  static transformDailyEntries(
    entries: any[],
    options: { 
      includeWeekends?: boolean
      statusFilter?: string[]
      groupByWeek?: boolean 
    } = {}
  ): any[] {
    let filtered = [...entries]
    
    // Filter weekends if needed
    if (!options.includeWeekends) {
      filtered = filtered.filter(entry => !entry.isWeekend)
    }
    
    // Filter by status
    if (options.statusFilter?.length) {
      filtered = filtered.filter(entry => 
        options.statusFilter!.includes(entry.status)
      )
    }
    
    // Group by week if requested
    if (options.groupByWeek) {
      const grouped = new Map<string, any[]>()
      
      filtered.forEach(entry => {
        const date = parseISO(entry.date)
        const weekStart = format(
          new Date(date.setDate(date.getDate() - date.getDay())), 
          'yyyy-MM-dd'
        )
        
        if (!grouped.has(weekStart)) {
          grouped.set(weekStart, [])
        }
        grouped.get(weekStart)!.push(entry)
      })
      
      // Transform to weekly summaries
      return Array.from(grouped.entries()).map(([weekStart, weekEntries]) => ({
        weekStarting: weekStart,
        totalEntries: weekEntries.length,
        totalHours: weekEntries.reduce((sum, entry) => sum + entry.hours, 0),
        employees: [...new Set(weekEntries.map(e => e.employeeName))].length,
        entries: weekEntries
      }))
    }
    
    return filtered
  }
  
  /**
   * Create pivot table data for store performance analysis
   */
  static createStorePivotData(
    entries: any[],
    dateRange: { start: string; end: string }
  ): any[] {
    const storeMap = new Map<string, Map<string, number>>()
    
    // Group by store and date
    entries.forEach(entry => {
      if (!storeMap.has(entry.storeName)) {
        storeMap.set(entry.storeName, new Map())
      }
      
      const storeData = storeMap.get(entry.storeName)!
      const currentHours = storeData.get(entry.date) || 0
      storeData.set(entry.date, currentHours + entry.hours)
    })
    
    // Generate date range for columns
    const start = parseISO(dateRange.start)
    const end = parseISO(dateRange.end)
    const dates: string[] = []
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(format(d, 'yyyy-MM-dd'))
    }
    
    // Create pivot table structure
    return Array.from(storeMap.entries()).map(([storeName, dateHours]) => {
      const row: any = { store: storeName }
      
      dates.forEach(date => {
        row[date] = dateHours.get(date) || 0
      })
      
      // Add totals
      row.totalHours = dates.reduce((sum, date) => sum + (row[date] || 0), 0)
      row.avgDailyHours = Math.round((row.totalHours / dates.length) * 100) / 100
      
      return row
    })
  }
}

// lib/services/export/utils/formatValidators.ts

/**
 * Format-specific validation utilities
 */
export class FormatValidators {
  
  /**
   * Validate Excel-specific constraints
   */
  static validateExcelExport(data: any): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = []
    
    // Excel row limit (1,048,576 rows)
    if (data.dailyEntries?.length > 1000000) {
      warnings.push('Data exceeds Excel row limit. Consider using CSV format.')
    }
    
    // Sheet name length limit (31 characters)
    if (data.stores?.some((store: any) => store.name.length > 31)) {
      warnings.push('Some store names exceed Excel sheet name limit (31 chars)')
    }
    
    // Cell content length (32,767 characters)
    const hasLongContent = data.dailyEntries?.some((entry: any) => 
      entry.notes && entry.notes.length > 32000
    )
    if (hasLongContent) {
      warnings.push('Some notes are very long and may be truncated in Excel')
    }
    
    return {
      isValid: warnings.length === 0,
      warnings
    }
  }
  
  /**
   * Validate CSV-specific constraints
   */
  static validateCSVExport(data: any): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = []
    
    // Check for problematic characters in CSV
    const hasCommasInData = data.dailyEntries?.some((entry: any) => 
      Object.values(entry).some((value: any) => 
        typeof value === 'string' && value.includes(',')
      )
    )
    
    if (hasCommasInData) {
      warnings.push('Data contains commas - values will be quoted in CSV')
    }
    
    // Large file warning
    if (data.dailyEntries?.length > 100000) {
      warnings.push('Large CSV file - consider using Excel format for better performance')
    }
    
    return {
      isValid: true, // CSV can handle most data
      warnings
    }
  }
  
}