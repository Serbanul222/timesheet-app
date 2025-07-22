// lib/services/exportService.ts - Clean version with CSV and Excel only
import { format, parseISO, eachDayOfInterval } from 'date-fns'

interface TimesheetRow {
  id: string
  store_id: string
  zone_id: string
  period_start: string
  period_end: string
  total_hours: number
  daily_entries: any
  store?: { name: string }
  zone?: { name: string }
}

interface ExportOptions {
  dateRange?: { startDate: string; endDate: string }
  format: 'excel' | 'csv'
  includeNotes?: boolean
  includeEmptyDays?: boolean
  filename?: string
}

interface ExportResult {
  success: boolean
  data?: { buffer: ArrayBuffer; filename: string; mimeType: string }
  error?: string
}

export class ExportService {
  
  static async exportTimesheets(
    timesheets: TimesheetRow[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log(`📊 Generating ${options.format} export for ${timesheets.length} timesheets`)
      console.log('📅 Date range requested:', options.dateRange)
      
      switch (options.format) {
        case 'excel':
          return await this.generateExcel(timesheets, options)
        case 'csv':
          return this.generateCSV(timesheets, options)
        default:
          throw new Error(`Unsupported format: ${options.format}. Supported formats: excel, csv`)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  // Process timesheet data into grid format with proper date filtering
  private static processTimesheetGrid(timesheets: TimesheetRow[], options: ExportOptions) {
    return timesheets.map(timesheet => {
      const employees = new Map<string, any>()
      const dailyEntries = timesheet.daily_entries || {}
      
      console.log(`\n🏪 Processing timesheet for: ${timesheet.store?.name}`)
      
      // Extract employees from the data structure
      Object.entries(dailyEntries).forEach(([empId, empData]: [string, any]) => {
        if (empData?.name) {
          employees.set(empId, {
            id: empId,
            name: empData.name,
            position: empData.position || 'Staff'
          })
        }
      })

      console.log(`👥 Found ${employees.size} employees:`, Array.from(employees.values()).map(e => e.name))

      // Use the actual date range from options, not the timesheet period
      let dateRange: Date[]
      if (options.dateRange?.startDate && options.dateRange?.endDate) {
        const startDate = parseISO(options.dateRange.startDate)
        const endDate = parseISO(options.dateRange.endDate)
        dateRange = eachDayOfInterval({ start: startDate, end: endDate })
        console.log(`📅 Using custom date range: ${options.dateRange.startDate} to ${options.dateRange.endDate}`)
      } else {
        // Fallback to timesheet period if no custom range
        const startDate = parseISO(timesheet.period_start)
        const endDate = parseISO(timesheet.period_end)
        dateRange = eachDayOfInterval({ start: startDate, end: endDate })
        console.log(`📅 Using timesheet period: ${timesheet.period_start} to ${timesheet.period_end}`)
      }

      return {
        id: timesheet.id,
        storeName: timesheet.store?.name || 'Unknown Store',
        zoneName: timesheet.zone?.name || 'Unknown Zone',
        periodStart: options.dateRange?.startDate || timesheet.period_start,
        periodEnd: options.dateRange?.endDate || timesheet.period_end,
        totalHours: timesheet.total_hours || 0,
        employees: Array.from(employees.values()),
        dateRange,
        dailyEntries
      }
    })
  }

  // Enhanced method to get day value with proper date filtering
  private static getDayValue(
    employeeId: string, 
    date: string, 
    dailyEntries: any, 
    includeEmptyDays: boolean = false
  ): string {
    if (!dailyEntries || !dailyEntries[employeeId]) {
      return includeEmptyDays ? 'off' : ''
    }

    const empData = dailyEntries[employeeId]
    if (!empData.days || !empData.days[date]) {
      return includeEmptyDays ? 'off' : ''
    }

    const dayData = empData.days[date]

    // PRIORITY 1: Time interval (this is what you want - "10-12")
    if (dayData.timeInterval && dayData.timeInterval.trim() && dayData.timeInterval !== 'alege') {
      return dayData.timeInterval
    }

    // PRIORITY 2: Status codes (CO, dispensa, etc.)
    if (dayData.status && dayData.status !== 'alege' && dayData.status.trim()) {
      return dayData.status
    }

    // PRIORITY 3: Construct from start/end times if interval missing
    if (dayData.startTime && dayData.endTime) {
      const startHour = dayData.startTime.split(':')[0]
      const endHour = dayData.endTime.split(':')[0]
      const timeInterval = `${startHour}-${endHour}`
      return timeInterval
    }

    // PRIORITY 4: Show hours if available
    if (dayData.hours && dayData.hours > 0) {
      return `${dayData.hours}h`
    }

    return includeEmptyDays ? 'off' : ''
  }

  // Generate Excel with proper date filtering
  private static async generateExcel(timesheets: TimesheetRow[], options: ExportOptions): Promise<ExportResult> {
    try {
      console.log('📊 Starting Excel generation with timesheets:', timesheets.length)
      
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()
      const processedTimesheets = this.processTimesheetGrid(timesheets, options)

      processedTimesheets.forEach((timesheet, index) => {
        console.log(`\n📄 Creating Excel sheet ${index + 1}: ${timesheet.storeName}`)
        
        const sheetData: any[][] = []
        
        // Header rows
        sheetData.push([`Timesheet: ${timesheet.storeName}`])
        sheetData.push([`Period: ${timesheet.periodStart} to ${timesheet.periodEnd}`])
        sheetData.push([]) // Empty row

        // Column headers - dates (day numbers)
        const headers = ['Employee Name', 'Position']
        timesheet.dateRange.forEach(date => {
          headers.push(format(date, 'd')) // Day number
        })
        sheetData.push(headers)

        // Weekday row
        const weekdayRow = ['', '']
        timesheet.dateRange.forEach(date => {
          weekdayRow.push(format(date, 'EEE')) // Mon, Tue, Wed
        })
        sheetData.push(weekdayRow)

        // Employee rows with filtered dates
        timesheet.employees.forEach(employee => {
          const row = [
            employee.name,
            employee.position
          ]
          
          // Add daily values for each date in the selected range
          timesheet.dateRange.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const dayValue = this.getDayValue(
              employee.id, 
              dateKey, 
              timesheet.dailyEntries,
              options.includeEmptyDays
            )
            row.push(dayValue)
          })
          
          sheetData.push(row)
        })

        // Calculate total hours for the selected period only
        let periodTotalHours = 0
        timesheet.employees.forEach(employee => {
          timesheet.dateRange.forEach(date => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const empData = timesheet.dailyEntries[employee.id]
            if (empData?.days?.[dateKey]?.hours) {
              periodTotalHours += empData.days[dateKey].hours
            }
          })
        })

        sheetData.push(['', `Total Hours: ${periodTotalHours}h`])

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData)
        
        // Set column widths
        const colWidths = [
          { wch: 25 }, // Employee name
          { wch: 15 }, // Position
          ...timesheet.dateRange.map(() => ({ wch: 8 })) // Date columns
        ]
        worksheet['!cols'] = colWidths

        const sheetName = `${timesheet.storeName}`.substring(0, 31)
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || `Sheet${index + 1}`)
      })

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array'
      })

      const arrayBuffer = excelBuffer instanceof ArrayBuffer ? excelBuffer : excelBuffer.buffer
      const filename = options.filename || 
        `timesheets_${format(parseISO(options.dateRange!.startDate), 'yyyy-MM-dd')}_to_${format(parseISO(options.dateRange!.endDate), 'yyyy-MM-dd')}.xlsx`

      console.log('✅ Excel generation completed successfully')

      return {
        success: true,
        data: {
          buffer: arrayBuffer,
          filename,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      }
    } catch (error) {
      console.error('❌ Excel generation failed:', error)
      throw new Error(`Excel generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Generate CSV with proper date filtering
  private static generateCSV(timesheets: TimesheetRow[], options: ExportOptions): ExportResult {
    const processedTimesheets = this.processTimesheetGrid(timesheets, options)
    const rows: string[] = []

    processedTimesheets.forEach((timesheet, index) => {
      if (index > 0) rows.push('')
      
      rows.push(`Timesheet: ${timesheet.storeName}`)
      rows.push(`Period: ${timesheet.periodStart} to ${timesheet.periodEnd}`)
      rows.push('')

      // Headers
      const headers = ['Employee Name', 'Position']
      timesheet.dateRange.forEach(date => {
        headers.push(format(date, 'MM/dd'))
      })
      rows.push(this.escapeCSVRow(headers))

      // Employee data
      timesheet.employees.forEach(employee => {
        const row = [employee.name, employee.position]
        
        timesheet.dateRange.forEach(date => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const dayValue = this.getDayValue(
            employee.id, 
            dateKey, 
            timesheet.dailyEntries,
            options.includeEmptyDays
          )
          row.push(dayValue)
        })
        
        rows.push(this.escapeCSVRow(row))
      })
    })

    const content = rows.join('\n')
    const uint8Array = new TextEncoder().encode(content)
    const buffer = uint8Array.buffer instanceof ArrayBuffer ? uint8Array.buffer : new ArrayBuffer(0)
    const filename = options.filename || 
      `timesheets_${format(parseISO(options.dateRange!.startDate), 'yyyy-MM-dd')}_to_${format(parseISO(options.dateRange!.endDate), 'yyyy-MM-dd')}.csv`

    return {
      success: true,
      data: {
        buffer: buffer as ArrayBuffer,
        filename,
        mimeType: 'text/csv'
      }
    }
  }

  private static escapeCSVRow(row: string[]): string {
    return row.map(cell => {
      // Ensure cell is a string before calling replace
      const cellStr = cell === null || cell === undefined ? '' : String(cell);
      const escaped = cellStr.replace(/"/g, '""')
      return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped
    }).join(',')
  }

  static downloadFile(buffer: ArrayBuffer, filename: string, mimeType: string) {
    const blob = new Blob([buffer], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}