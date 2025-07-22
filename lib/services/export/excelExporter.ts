// lib/services/export/excelExporter.ts
import { ProcessedTimesheetData, ExportOptions, ExportResult, EXPORT_TEMPLATES } from '@/types/exports'
import { format, parseISO } from 'date-fns'

interface ExcelWorkbook {
  sheets: ExcelSheet[]
  metadata: {
    title: string
    author: string
    created: string
  }
}

interface ExcelSheet {
  name: string
  data: any[][]
  headers: string[]
  styling?: {
    headerStyle?: any
    rowStyles?: Record<number, any>
    columnWidths?: Record<number, number>
  }
}

/**
 * Excel export functionality using browser-compatible approach
 * Think of this as a data transformer - like converting a Java object to XML
 */
export class ExcelExporter {
  
  /**
   * Export to Excel format
   */
  static async export(
    data: ProcessedTimesheetData,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      console.log('📊 Generating Excel export...')
      
      // Create workbook structure - like building a multi-table report
      const workbook = this.createWorkbook(data, options)
      
      // Convert to Excel file using SheetJS
      const buffer = await this.generateExcelFile(workbook)
      
      const filename = this.generateFilename(data, options, 'xlsx')
      
      return {
        success: true,
        data: {
          buffer,
          filename,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: buffer.byteLength
        },
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ Excel export failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Excel export failed',
        timestamp: new Date().toISOString()
      }
    }
  }
  
  /**
   * Create workbook structure based on template
   * Similar to creating a multi-page report with different views of the same data
   */
  private static createWorkbook(data: ProcessedTimesheetData, options: ExportOptions): ExcelWorkbook {
    const template = this.getTemplate(options)
    const sheets: ExcelSheet[] = []
    
    // Summary sheet - high-level overview
    if (template.sheets?.some(s => s.type === 'summary') || !template.sheets) {
      sheets.push(this.createSummarySheet(data))
    }
    
    // Store summary sheet
    if (template.sheets?.some(s => s.type === 'stores') || !template.sheets) {
      sheets.push(this.createStoreSheet(data))
    }
    
    // Employee summary sheet
    if (template.sheets?.some(s => s.type === 'employees') || !template.sheets) {
      sheets.push(this.createEmployeeSheet(data))
    }
    
    // Detailed daily entries sheet
    if (template.sheets?.some(s => s.type === 'details') || !template.sheets) {
      sheets.push(this.createDetailsSheet(data, options))
    }
    
    return {
      sheets,
      metadata: {
        title: 'Timesheet Export Report',
        author: 'Timesheet Management System',
        created: new Date().toISOString()
      }
    }
  }
  
  /**
   * Create summary overview sheet
   */
  private static createSummarySheet(data: ProcessedTimesheetData): ExcelSheet {
    const headers = ['Metric', 'Value']
    const summaryData = [
      ['Export Date', format(new Date(), 'PPP')],
      ['Date Range', `${data.summary.dateRange.start} to ${data.summary.dateRange.end}`],
      ['Total Timesheets', data.summary.totalTimesheets.toString()],
      ['Total Employees', data.summary.totalEmployees.toString()],
      ['Total Hours', `${data.summary.totalHours} hours`],
      ['Average Hours per Employee', Math.round((data.summary.totalHours / data.summary.totalEmployees) * 100) / 100],
      ['Stores Included', data.stores.length.toString()]
    ]
    
    return {
      name: 'Summary',
      headers,
      data: summaryData,
      styling: {
        headerStyle: { bold: true, backgroundColor: '#4F81BD', color: 'white' },
        columnWidths: { 0: 25, 1: 20 }
      }
    }
  }
  
  /**
   * Create store summary sheet
   */
  private static createStoreSheet(data: ProcessedTimesheetData): ExcelSheet {
    const headers = ['Store Name', 'Zone', 'Employees', 'Total Hours', 'Avg Hours/Employee', 'Timesheets']
    
    const storeData = data.stores.map(store => [
      store.name,
      store.zoneName || '',
      store.employeeCount.toString(),
      store.totalHours.toString(),
      store.employeeCount > 0 
        ? Math.round((store.totalHours / store.employeeCount) * 100) / 100 
        : 0,
      store.timesheetCount.toString()
    ])
    
    return {
      name: 'Store Summary',
      headers,
      data: storeData,
      styling: {
        headerStyle: { bold: true, backgroundColor: '#4F81BD', color: 'white' },
        columnWidths: { 0: 20, 1: 15, 2: 12, 3: 12, 4: 15, 5: 12 }
      }
    }
  }
  
  /**
   * Create employee summary sheet
   */
  private static createEmployeeSheet(data: ProcessedTimesheetData): ExcelSheet {
    const headers = ['Employee Name', 'Position', 'Store', 'Total Hours', 'Days Worked', 'Avg Hours/Day', 'Delegated']
    
    const employeeData = data.employees.map(employee => [
      employee.name,
      employee.position,
      employee.storeName,
      employee.totalHours.toString(),
      employee.daysWorked.toString(),
      employee.daysWorked > 0 
        ? Math.round((employee.totalHours / employee.daysWorked) * 100) / 100 
        : 0,
      employee.isDelegated ? 'Yes' : 'No'
    ])
    
    return {
      name: 'Employee Summary',
      headers,
      data: employeeData,
      styling: {
        headerStyle: { bold: true, backgroundColor: '#4F81BD', color: 'white' },
        columnWidths: { 0: 20, 1: 15, 2: 15, 3: 12, 4: 12, 5: 12, 6: 10 },
        rowStyles: this.getEmployeeRowStyles(data.employees)
      }
    }
  }
  
  /**
   * Create detailed daily entries sheet
   */
  private static createDetailsSheet(data: ProcessedTimesheetData, options: ExportOptions): ExcelSheet {
    const headers = [
      'Store',
      'Employee',
      'Position', 
      'Date',
      'Day',
      'Time Interval',
      'Hours',
      'Status',
      'Status Description'
    ]
    
    if (options.includeNotes) {
      headers.push('Notes')
    }
    
    if (options.includeDelegated) {
      headers.push('Delegated')
    }
    
    const detailData = data.dailyEntries.map(entry => {
      const row = [
        entry.storeName,
        entry.employeeName,
        entry.position,
        format(parseISO(entry.date), 'yyyy-MM-dd'),
        entry.dayOfWeek,
        entry.timeInterval || '',
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
      
      return row
    })
    
    return {
      name: 'Daily Details',
      headers,
      data: detailData,
      styling: {
        headerStyle: { bold: true, backgroundColor: '#4F81BD', color: 'white' },
        columnWidths: { 0: 15, 1: 20, 2: 15, 3: 12, 4: 10, 5: 12, 6: 8, 7: 10, 8: 15 },
        rowStyles: this.getDetailRowStyles(data.dailyEntries)
      }
    }
  }
  
  /**
   * Generate Excel file using SheetJS (browser-compatible)
   * This is like serializing your Java objects to a binary format
   */
  private static async generateExcelFile(workbook: ExcelWorkbook): Promise<ArrayBuffer> {
    // In a real implementation, you would use SheetJS here
    // This is a placeholder that demonstrates the structure
    
    try {
      // Dynamic import to avoid bundling issues
      const XLSX = await import('xlsx')
      
      const wb = XLSX.utils.book_new()
      
      workbook.sheets.forEach(sheet => {
        // Convert data to worksheet
        const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.data])
        
        // Apply column widths
        if (sheet.styling?.columnWidths) {
          const colWidths = Object.entries(sheet.styling.columnWidths).map(([col, width]) => ({
            wch: width
          }))
          ws['!cols'] = colWidths
        }
        
        // Add sheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, sheet.name)
      })
      
      // Generate binary Excel file
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'array',
        compression: true 
      })
      
      return excelBuffer.buffer
      
    } catch (error) {
      console.error('SheetJS not available, generating CSV-like format:', error)
      
      // Fallback: generate a simple text-based format
      let content = `# ${workbook.metadata.title}\n`
      content += `Generated: ${workbook.metadata.created}\n\n`
      
      workbook.sheets.forEach(sheet => {
        content += `## ${sheet.name}\n`
        content += sheet.headers.join('\t') + '\n'
        sheet.data.forEach(row => {
          content += row.join('\t') + '\n'
        })
        content += '\n'
      })
      
      return new TextEncoder().encode(content).buffer
    }
  }
  
  /**
   * Get styling for employee rows (highlight delegated employees)
   */
  private static getEmployeeRowStyles(employees: ProcessedTimesheetData['employees']): Record<number, any> {
    const styles: Record<number, any> = {}
    
    employees.forEach((employee, index) => {
      if (employee.isDelegated) {
        styles[index + 1] = { backgroundColor: '#E3F2FD' } // Light blue for delegated
      }
    })
    
    return styles
  }
  
  /**
   * Get styling for detail rows (highlight weekends)
   */
  private static getDetailRowStyles(entries: ProcessedTimesheetData['dailyEntries']): Record<number, any> {
    const styles: Record<number, any> = {}
    
    entries.forEach((entry, index) => {
      if (entry.isWeekend) {
        styles[index + 1] = { backgroundColor: '#FFF2CC' } // Light yellow for weekends
      }
    })
    
    return styles
  }
  
  /**
   * Get export template based on options
   */
  private static getTemplate(options: ExportOptions) {
    if (options.groupByStore) {
      return EXPORT_TEMPLATES.summary
    }
    if (options.groupByEmployee) {
      return EXPORT_TEMPLATES.payroll
    }
    return EXPORT_TEMPLATES.detailed
  }
  
  /**
   * Generate filename with timestamp
   */
  private static generateFilename(
    data: ProcessedTimesheetData, 
    options: ExportOptions, 
    extension: string
  ): string {
    if (options.filename) {
      return options.filename.endsWith(`.${extension}`) 
        ? options.filename 
        : `${options.filename}.${extension}`
    }
    
    const dateStr = format(new Date(), 'yyyy-MM-dd')
    const startDate = data.summary.dateRange.start 
      ? format(parseISO(data.summary.dateRange.start), 'MMM-dd')
      : 'unknown'
    const endDate = data.summary.dateRange.end 
      ? format(parseISO(data.summary.dateRange.end), 'MMM-dd') 
      : 'unknown'
    
    return `timesheets_${startDate}_to_${endDate}_exported_${dateStr}.${extension}`
  }
}