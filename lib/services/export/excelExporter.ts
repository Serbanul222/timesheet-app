// lib/services/export/excelExporter.ts - CORRECTED VERSION
import { ProcessedTimesheetData, ExportOptions, ExportResult } from '@/types/exports'
import { format, parseISO } from 'date-fns'
import * as ExcelJS from 'exceljs'

/**
 * Excel exporter using ExcelJS - CORRECTED to fix Romanian days and column structure
 */
export class ExcelExporter {
  
  static async export(
    data: ProcessedTimesheetData,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    try {
      console.log('📊 Generating proper Excel export with ExcelJS...')
      
      // Create workbook
      const workbook = new ExcelJS.Workbook()
      
      // Set workbook properties
      workbook.creator = 'Ponteo Export System'
      workbook.created = new Date()
      workbook.modified = new Date()
      workbook.description = 'Timesheet export with employee totals'
      
      // Create sheets
      await this.createSummarySheet(workbook, data, options)
      
      if (data.timesheets.length > 0) {
        await this.createTimesheetGridSheets(workbook, data, options)
      }
      
      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer() as ArrayBuffer
      const filename = this.generateFilename(data, options)
      
      console.log(`✅ Excel file generated: ${filename} (${buffer.byteLength} bytes)`)
      
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
   * Create summary sheet with overall statistics
   */
  private static async createSummarySheet(
    workbook: ExcelJS.Workbook,
    data: ProcessedTimesheetData,
    options: ExportOptions
  ): Promise<void> {
    console.log('📋 Creating summary sheet...')
    const worksheet = workbook.addWorksheet('Sumar')
    
    // Title section
    const titleCell = worksheet.getCell('A1')
    titleCell.value = 'RAPORT PONTAJE'
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    titleCell.alignment = { horizontal: 'center' }
    
    // Merge title across columns
    worksheet.mergeCells('A1:F1')
    
    // Export info
    worksheet.getCell('A3').value = `Exportat la: ${this.formatDate(data.summary.exportedAt, 'dd/MM/yyyy HH:mm')}`
    worksheet.getCell('A4').value = `Perioada: ${this.formatDate(data.summary.dateRange.start)} - ${this.formatDate(data.summary.dateRange.end)}`
    
    // Statistics section
    worksheet.getCell('A6').value = 'STATISTICI GENERALE'
    worksheet.getCell('A6').font = { bold: true, size: 12 }
    
    worksheet.getCell('A7').value = 'Total Angajați:'
    worksheet.getCell('B7').value = data.summary.totalEmployees
    worksheet.getCell('A8').value = 'Total Ore:'
    worksheet.getCell('B8').value = `${data.summary.totalHours}h`
    worksheet.getCell('A9').value = 'Total Foi de Pontaj:'
    worksheet.getCell('B9').value = data.summary.totalTimesheets
    
    // Employee summary section
    worksheet.getCell('A11').value = 'SUMAR ANGAJAȚI'
    worksheet.getCell('A11').font = { bold: true, size: 12 }
    
    // Employee table headers
    const empHeaders = ['Nume Angajat', 'Poziție', 'Magazin', 'Total Ore', 'Zile Lucrate', 'Medie Ore/Zi']
    empHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(12, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    
    // Employee data
    data.employees.forEach((employee, index) => {
      const row = 13 + index
      const avgHoursPerDay = employee.daysWorked > 0 ? 
        Math.round((employee.totalHours / employee.daysWorked) * 100) / 100 : 0
      
      const rowData = [
        employee.name,
        employee.position,
        employee.storeName,
        `${employee.totalHours}h`,
        employee.daysWorked,
        `${avgHoursPerDay}h`
      ]
      
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1)
        cell.value = value
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
        
        // Highlight total hours
        if (colIndex === 3) {
          cell.font = { bold: true, color: { argb: 'FF0066CC' } }
        }
      })
    })
    
    // Store summary section
    const storeStartRow = 15 + data.employees.length
    worksheet.getCell(`A${storeStartRow}`).value = 'SUMAR MAGAZINE'
    worksheet.getCell(`A${storeStartRow}`).font = { bold: true, size: 12 }
    
    // Store table headers
    const storeHeaders = ['Nume Magazin', 'Zonă', 'Angajați', 'Total Ore']
    storeHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(storeStartRow + 1, index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    })
    
    // Store data
    data.stores.forEach((store, index) => {
      const row = storeStartRow + 2 + index
      const rowData = [
        store.name,
        store.zoneName || 'N/A',
        store.employeeCount,
        `${store.totalHours}h`
      ]
      
      rowData.forEach((value, colIndex) => {
        const cell = worksheet.getCell(row, colIndex + 1)
        cell.value = value
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    })
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0
      column?.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10
        if (columnLength > maxLength) {
          maxLength = columnLength
        }
      })
      column.width = Math.min(Math.max(maxLength + 2, 10), 50)
    })
  }
  
  /**
   * Create timesheet grid sheets for each store (like your UI)
   */
  private static async createTimesheetGridSheets(
    workbook: ExcelJS.Workbook,
    data: ProcessedTimesheetData,
    options: ExportOptions
  ): Promise<void> {
    console.log('📊 Creating timesheet grid sheets...')
    
    // Group entries by store
    const storeGroups = new Map<string, any[]>()
    
    data.dailyEntries.forEach(entry => {
      if (!storeGroups.has(entry.storeId)) {
        storeGroups.set(entry.storeId, [])
      }
      storeGroups.get(entry.storeId)!.push(entry)
    })
    
    for (const [storeId, entries] of storeGroups) {
      const store = data.stores.find(s => s.id === storeId)
      const storeName = store?.name || 'Unknown Store'
      const storeEmployees = data.employees.filter(e => e.storeId === storeId)
      
      await this.createStoreTimesheetSheet(workbook, storeName, entries, storeEmployees, options)
    }
  }
  
  /**
   * Create individual store timesheet sheet - CORRECTED VERSION
   */
  private static async createStoreTimesheetSheet(
    workbook: ExcelJS.Workbook,
    storeName: string,
    entries: any[],
    employees: any[],
    options: ExportOptions
  ): Promise<void> {
    const sheetName = this.sanitizeSheetName(storeName)
    const worksheet = workbook.addWorksheet(sheetName)
    
    console.log(`📋 Creating sheet for store: ${storeName}`)
    
    // Header
    const headerCell = worksheet.getCell('A1')
    headerCell.value = `Magazin: ${storeName}`
    headerCell.font = { bold: true, size: 14 }
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    headerCell.font = { ...headerCell.font, color: { argb: 'FFFFFFFF' } }
    
    if (entries.length === 0) {
      worksheet.getCell('A3').value = 'Nu sunt date disponibile pentru această perioadă'
      return
    }
    
    // Get unique dates and sort them
    const dates = [...new Set(entries.map(e => e.date))].sort()
    console.log(`📅 Processing ${dates.length} unique dates for ${storeName}`)
    
    // CORRECTED: Create header row with proper structure (no separate interval columns)
    let colIndex = 1
    worksheet.getCell(3, colIndex++).value = 'Nume Angajat'
    worksheet.getCell(3, colIndex++).value = 'Poziție'
    
    dates.forEach(date => {
      const dayNum = format(parseISO(date), 'd')
      const dayName = this.getRomanianDayName(parseISO(date))
      worksheet.getCell(3, colIndex++).value = `${dayNum} ${dayName}`
      // NO separate interval column here!
    })
    worksheet.getCell(3, colIndex++).value = 'TOTAL ORE'
    
    // Style header row
    for (let i = 1; i < colIndex; i++) {
      const cell = worksheet.getCell(3, i)
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } }
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      }
    }
    
    // CORRECTED: Add employee rows with combined data in single cells
    employees.forEach((employee, empIndex) => {
      const row = 4 + empIndex
      const employeeEntries = entries.filter(e => e.employeeId === employee.id)
      
      let colIdx = 1
      worksheet.getCell(row, colIdx++).value = employee.name
      worksheet.getCell(row, colIdx++).value = employee.position
      
      // For each date, put everything in ONE cell
      dates.forEach(date => {
        const entryForDate = employeeEntries.find(e => e.date === date)
        const hours = entryForDate?.hours || 0
        const interval = entryForDate?.timeInterval || ''
        const status = entryForDate?.status || 'alege'
        
        let cellValue = ''
        
        if (hours > 0) {
          if (interval && status !== 'alege' && status.trim() !== '') {
            // Has both interval and status - show interval with status (for partial absences like DEL)
            cellValue = `${interval} (${status})`
          } else if (status !== 'alege' && status.trim() !== '') {
            // Status without interval - show hours with status code
            cellValue = `${hours}h (${status})`
          } else if (interval) {
            // Normal working hours with time interval
            cellValue = interval
          } else {
            // Hours without interval or status
            cellValue = `${hours}h`
          }
        } else if (status !== 'alege' && status.trim() !== '') {
          // Status without hours - just show the status code
          cellValue = status
        }
        // Empty cell for 'alege' status with no hours
        
        worksheet.getCell(row, colIdx++).value = cellValue
      })
      
      // Add employee total
      const totalCell = worksheet.getCell(row, colIdx++)
      totalCell.value = `${employee.totalHours}h`
      totalCell.font = { bold: true, color: { argb: 'FF0066CC' } }
      
      // Style employee name
      worksheet.getCell(row, 1).font = { bold: true }
      
      // Add borders to all cells
      for (let i = 1; i < colIdx; i++) {
        const cell = worksheet.getCell(row, i)
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      }
    })
    
    // Store total row
    const totalRow = 4 + employees.length + 1
    const storeTotalHours = employees.reduce((sum, emp) => sum + emp.totalHours, 0)
    const totalCell = worksheet.getCell(totalRow, 1)
    totalCell.value = `TOTAL MAGAZIN: ${storeTotalHours}h`
    totalCell.font = { bold: true, color: { argb: 'FF006600' } }
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      if (index === 0) column.width = 25 // Employee name
      else if (index === 1) column.width = 15 // Position
      else column.width = 12 // Date columns and total
    })
  }
  
  // Helper methods
  private static sanitizeSheetName(name: string): string {
    return name
      .replace(/[\\\/\[\]\*\?:]/g, '_')
      .substring(0, 31)
  }
  
  private static getRomanianDayName(date: Date): string {
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
    return dayNames[date.getDay()]
  }
  
  private static formatDate(dateString: string, formatString: string = 'dd/MM/yyyy'): string {
    try {
      return format(parseISO(dateString), formatString)
    } catch {
      return dateString
    }
  }
  
  private static generateFilename(data: ProcessedTimesheetData, options: ExportOptions): string {
    if (options.filename) {
      return options.filename.endsWith('.xlsx') ? options.filename : `${options.filename}.xlsx`
    }
    
    const dateStr = format(new Date(), 'dd-MM-yyyy')
    return `pontaje_${dateStr}.xlsx`
  }
}