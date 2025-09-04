// lib/debug/exportDebugger.ts - Debug tool for export issues
import { TimesheetDataProcessor } from '../services/export/timesheetDataProcessor'

export class ExportDebugger {
  
  /**
   * Debug the export data processing step by step
   * Add this to your export hook temporarily
   */
  static debugExportData(timesheets: any[], options: any) {
    console.log('🐛 === EXPORT DEBUG SESSION ===')
    console.log('📊 Input timesheets count:', timesheets.length)
    
    // Debug first timesheet structure
    if (timesheets.length > 0) {
      const firstTimesheet = timesheets[0]
      console.log('📋 First timesheet structure:')
      console.log('- ID:', firstTimesheet.id)
      console.log('- Store ID:', firstTimesheet.store_id)
      console.log('- Store Name:', firstTimesheet.store?.name)
      console.log('- Period:', firstTimesheet.period_start, 'to', firstTimesheet.period_end)
      console.log('- Daily entries type:', typeof firstTimesheet.daily_entries)
      console.log('- Daily entries keys:', Object.keys(firstTimesheet.daily_entries || {}))
      
      // Analyze daily entries structure
      const dailyEntries = firstTimesheet.daily_entries
      if (dailyEntries) {
        console.log('📊 Daily entries analysis:')
        Object.entries(dailyEntries).forEach(([key, value]: [string, any]) => {
          console.log(`  - Key: ${key}`)
          console.log(`  - Type: ${typeof value}`)
          if (value && typeof value === 'object') {
            console.log(`  - Properties:`, Object.keys(value))
            if (value.name) console.log(`    - Name: ${value.name}`)
            if (value.position) console.log(`    - Position: ${value.position}`)
            if (value.days) {
              console.log(`    - Days count: ${Object.keys(value.days).length}`)
              console.log(`    - Date keys:`, Object.keys(value.days))
              
              // Show sample day data
              const firstDateKey = Object.keys(value.days)[0]
              if (firstDateKey) {
                console.log(`    - Sample day (${firstDateKey}):`, value.days[firstDateKey])
              }
            }
          }
        })
      }
    }
    
    console.log('⚙️ Export options:')
    console.log('- Date range:', options.dateRange)
    console.log('- Include notes:', options.includeNotes)
    console.log('- Include empty days:', options.includeEmptyDays)
    
    // Test data processing
    console.log('🔄 Testing data processing...')
    try {
      const processedData = TimesheetDataProcessor.processTimesheets(timesheets, options)
      
      console.log('✅ Processing successful!')
      console.log('📊 Results summary:')
      console.log('- Employees:', processedData.employees.length)
      console.log('- Stores:', processedData.stores.length)
      console.log('- Daily entries:', processedData.dailyEntries.length)
      console.log('- Total hours:', processedData.summary.totalHours)
      
      // Show sample employee
      if (processedData.employees.length > 0) {
        const firstEmployee = processedData.employees[0]
        console.log('👤 Sample employee:')
        console.log('- Name:', firstEmployee.name)
        console.log('- Total hours:', firstEmployee.totalHours)
        console.log('- Days worked:', firstEmployee.daysWorked)
      }
      
      // Show sample daily entries
      if (processedData.dailyEntries.length > 0) {
        const firstEntry = processedData.dailyEntries[0]
        console.log('📅 Sample daily entry:')
        console.log('- Employee:', firstEntry.employeeName)
        console.log('- Date:', firstEntry.date)
        console.log('- Hours:', firstEntry.hours)
        console.log('- Time interval:', firstEntry.timeInterval)
      }
      
      return processedData
      
    } catch (error) {
      console.error('❌ Processing failed:', error)
      throw error
    }
  }
  
  /**
   * Test date filtering logic separately
   */
  static testDateFiltering(timesheets: any[], dateRange: { startDate: string; endDate: string }) {
    console.log('📅 Testing date filtering...')
    console.log('Filter range:', dateRange.startDate, 'to', dateRange.endDate)
    
    timesheets.forEach((ts, index) => {
      console.log(`\n📋 Timesheet ${index + 1}:`)
      console.log('- ID:', ts.id)
      console.log('- Period:', ts.period_start, 'to', ts.period_end)
      
      const dailyEntries = ts.daily_entries
      if (dailyEntries) {
        let foundValidDates = 0
        Object.values(dailyEntries).forEach((empData: any) => {
          if (empData?.days) {
            Object.keys(empData.days).forEach(dateKey => {
              const entryDate = new Date(dateKey)
              const filterStart = new Date(dateRange.startDate)
              const filterEnd = new Date(dateRange.endDate)
              
              if (entryDate >= filterStart && entryDate <= filterEnd) {
                foundValidDates++
                console.log(`  ✅ Valid date found: ${dateKey}`)
              } else {
                console.log(`  ❌ Date outside range: ${dateKey}`)
              }
            })
          }
        })
        console.log(`- Valid dates in range: ${foundValidDates}`)
      }
    })
  }
}

// Usage in your export hook or component:
/*
// Add this to your useTimesheetExport hook temporarily:
export const debugExport = async (timesheets: any[], options: any) => {
  const processedData = ExportDebugger.debugExportData(timesheets, options)
  return processedData
}

// Or call it directly in your export process:
console.log('🐛 Debug mode enabled')
const debugResult = ExportDebugger.debugExportData(timesheets, exportOptions)
*/