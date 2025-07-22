// lib/services/export/csvExporter.ts - Fixed version that prevents date auto-conversion
import { ProcessedTimesheetData, ExportOptions, ExportResult } from '@/types/exports'
import { format, parseISO } from 'date-fns'

export class CSVExporter {
 
  static async export(
    data: ProcessedTimesheetData,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      console.log('📄 Generating CSV export with date auto-conversion prevention...')
     
      const csvContent = this.generateCSV(data, options)
      const buffer = new TextEncoder().encode(csvContent).buffer
      const filename = this.generateFilename(data, options)
     
      return {
        success: true,
        data: {
          buffer,
          filename,
          mimeType: 'text/csv',
          size: buffer.byteLength
        },
        timestamp: new Date().toISOString()
      }
     
    } catch (error) {
      console.error('❌ CSV export failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV export failed',
        timestamp: new Date().toISOString()
      }
    }
  }
 
  private static generateCSV(data: ProcessedTimesheetData, options: ExportOptions): string {
    const rows: string[] = []
   
    const headers = [
      'Store Name',
      'Employee Name',
      'Position',
      'Employee Code',
      'Date',
      'Day of Week',
      'Time Interval',
      'Hours',
      'Status',
      'Status Description'
    ]
   
    if (options.includeNotes) {
      headers.push('Notes')
    }
   
    if (options.includeDelegated) {
      headers.push('Is Delegated')
    }
   
    rows.push(this.escapeCSVRow(headers))
   
    data.dailyEntries.forEach(entry => {
      // CRITICAL FIX: Prevent Excel from auto-converting time intervals to dates
      let timeInterval = entry.timeInterval || ''
      
      // If time interval looks like it could be interpreted as a date (e.g., "10-12", "9-17")
      // then we need to prevent Excel from auto-converting it
      if (timeInterval && /^\d{1,2}-\d{1,2}$/.test(timeInterval)) {
        // Method 1: Use tab character prefix (works well for time intervals)
        timeInterval = `\t${timeInterval}`
        
        // Alternative Method 2: You could also use ="10-12" format
        // timeInterval = `="${timeInterval}"`
      }
      
      const row = [
        entry.storeName,
        entry.employeeName,
        entry.position,
        entry.employeeId,
        format(parseISO(entry.date), 'yyyy-MM-dd'),
        entry.dayOfWeek,
        timeInterval, // Now properly formatted to prevent auto-conversion
        entry.hours.toString(),
        entry.status,
        entry.statusDescription
      ]
     
      if (options.includeNotes) {
        row.push(entry.notes || '')
      }
     
      if (options.includeDelegated) {
        row.push(entry.isDelegated ? 'Yes' : 'No')
      }
     
      rows.push(this.escapeCSVRow(row))
    })
   
    return rows.join('\n')
  }
 
  private static escapeCSVRow(row: string[]): string {
    return row.map(cell => {
      // Handle null/undefined
      if (cell === null || cell === undefined) return ''
      
      // Convert to string
      const cellStr = String(cell)
      
      // Escape quotes by doubling them
      const escaped = cellStr.replace(/"/g, '""')
      
      // Wrap in quotes if contains comma, quote, newline, or carriage return
      return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped
    }).join(',')
  }
 
  private static generateFilename(data: ProcessedTimesheetData, options: ExportOptions): string {
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    return options.filename || `timesheets_export_${dateStr}.csv`
  }
}