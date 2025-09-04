// hooks/useTimesheetExport.ts - Enhanced with ExportDebugger integration
'use client'

import { useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { TimesheetDataProcessor } from '@/lib/services/export/timesheetDataProcessor'
import { ExcelExporter } from '@/lib/services/export/excelExporter'
import { ExportDebugger } from '@/lib/debug/exportDebugger'
import type { ExportOptions, ExportResult } from '@/types/exports'

type ExportFormat = 'excel'

interface ExportState {
  isLoading: boolean
  progress?: number
  statusText?: string
  lastExport?: {
    success: boolean
    filename: string
    timestamp: string
  } | null
}

interface UseTimesheetExportReturn {
  exportState: ExportState
  exportTimesheets: (options: ExportOptions) => Promise<ExportResult>
  validateExportOptions: (options: ExportOptions) => string[]
  getAvailableFormats: (userRole: string) => readonly ExportFormat[]
}

/**
 * Custom hook for timesheet export functionality
 * Think of this as a service layer in Spring Boot - handles business logic and state
 */
export function useTimesheetExport(): UseTimesheetExportReturn {
  const [exportState, setExportState] = useState<ExportState>({
    isLoading: false,
    progress: 0,
    statusText: '',
    lastExport: null
  })

  /**
   * Update export progress - like a progress callback in Java
   */
  const updateProgress = useCallback((progress: number, statusText: string) => {
    setExportState(prev => ({
      ...prev,
      progress,
      statusText
    }))
  }, [])

  /**
   * Validate export options - similar to @Valid in Spring Boot
   */
  const validateExportOptions = useCallback((options: ExportOptions): string[] => {
    const errors: string[] = []

    // Date range validation
    if (!options.dateRange?.startDate || !options.dateRange?.endDate) {
      errors.push('Date range is required')
    } else {
      const startDate = new Date(options.dateRange.startDate)
      const endDate = new Date(options.dateRange.endDate)
      
      if (startDate > endDate) {
        errors.push('Start date must be before end date')
      }
      
      // Check for reasonable date ranges (not more than 2 years)
      const daysDiff = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff > 730) {
        errors.push('Date range cannot exceed 2 years')
      }
    }

    // Filename validation
    if (options.filename) {
      const invalidChars = /[<>:"/\\|?*]/
      if (invalidChars.test(options.filename)) {
        errors.push('Filename contains invalid characters')
      }
    }

    return errors
  }, [])

  /**
   * Fetch timesheet data from database
   */
  const fetchTimesheetData = useCallback(async (options: ExportOptions) => {
    console.log('🔍 Fetching timesheet data from database...')
    updateProgress(10, 'Connecting to database...')

    try {
      let query = supabase
        .from('timesheets')
        .select(`
          id,
          grid_title,
          store_id,
          zone_id,
          period_start,
          period_end,
          total_hours,
          employee_count,
          daily_entries,
          created_at,
          updated_at,
          store:stores(name),
          zone:zones(name)
        `)
        .order('period_start', { ascending: false })

      // Apply filters if specified
      if (options.storeIds?.length) {
        query = query.in('store_id', options.storeIds)
      }

      if (options.zoneIds?.length) {
        query = query.in('zone_id', options.zoneIds)
      }

      updateProgress(25, 'Fetching timesheets...')

      const { data, error } = await query

      if (error) {
        console.error('❌ Database query error:', error)
        throw new Error(`Database error: ${error.message}`)
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No timesheets found matching criteria')
        return []
      }

      console.log(`✅ Fetched ${data.length} timesheets from database`)
      updateProgress(40, 'Processing timesheet data...')

      return data
    } catch (error) {
      console.error('❌ Error fetching timesheet data:', error)
      throw error
    }
  }, [updateProgress])

  /**
   * Main export function with integrated debugging
   */
  const exportTimesheets = useCallback(async (options: ExportOptions): Promise<ExportResult> => {
    console.log('🚀 Starting export process with options:', options)

    try {
      setExportState(prev => ({
        ...prev,
        isLoading: true,
        progress: 0,
        statusText: 'Initializing export...'
      }))

      // Step 1: Validate options
      const validationErrors = validateExportOptions(options)
      if (validationErrors.length > 0) {
        throw new Error(`Invalid export options: ${validationErrors.join(', ')}`)
      }

      // Step 2: Fetch data from database
      const rawTimesheets = await fetchTimesheetData(options)
      
      if (rawTimesheets.length === 0) {
        updateProgress(100, 'No data found')
        return {
          success: false,
          error: 'No timesheets found for the specified criteria',
          timestamp: new Date().toISOString()
        }
      }

      // Step 3: DEBUG SESSION - Analyze the raw data
      console.log('🐛 === STARTING DEBUG SESSION ===')
      updateProgress(45, 'Debugging data structure...')
      
      // Run comprehensive debug analysis
      ExportDebugger.debugExportData(rawTimesheets, options)
      
      // Test date filtering specifically
      if (options.dateRange) {
        console.log('🔍 Testing date filtering logic...')
        ExportDebugger.testDateFiltering(rawTimesheets, options.dateRange)
      }

      updateProgress(50, 'Processing data for export...')

      // Step 4: Process the data through our pipeline
      console.log('⚙️ Processing timesheet data...')
      const processedData = TimesheetDataProcessor.processTimesheets(rawTimesheets, options)

      // Step 5: Validate processed data
      if (!processedData.employees.length && !options.includeEmptyDays) {
        console.warn('⚠️ No employees found in processed data')
        return {
          success: false,
          error: 'No employee data found for the specified date range',
          timestamp: new Date().toISOString()
        }
      }

      if (!processedData.dailyEntries.length && !options.includeEmptyDays) {
        console.warn('⚠️ No daily entries found in processed data')
        // Still continue - we might have summary data
      }

      updateProgress(70, 'Generating Excel file...')

      // Step 6: Generate Excel export
      console.log('📊 Generating Excel file...')
      const exportResult = await ExcelExporter.export(processedData, options)

      if (!exportResult.success) {
        throw new Error(exportResult.error || 'Export generation failed')
      }

      updateProgress(100, 'Export completed successfully!')

      // Step 7: Update state with success
      setExportState(prev => ({
        ...prev,
        isLoading: false,
        lastExport: {
          success: true,
          filename: exportResult.data?.filename || 'export.xlsx',
          timestamp: new Date().toISOString()
        }
      }))

      console.log('✅ Export completed successfully!')
      console.log('📊 Final stats:', {
        fileSize: exportResult.data?.size,
        employees: processedData.employees.length,
        dailyEntries: processedData.dailyEntries.length,
        totalHours: processedData.summary.totalHours
      })

      return exportResult

    } catch (error) {
      console.error('❌ Export process failed:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error'
      
      setExportState(prev => ({
        ...prev,
        isLoading: false,
        lastExport: {
          success: false,
          filename: '',
          timestamp: new Date().toISOString()
        }
      }))

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    }
  }, [validateExportOptions, fetchTimesheetData, updateProgress])

  /**
   * Get available export formats based on user role
   */
  const getAvailableFormats = useCallback((userRole: string): readonly ExportFormat[] => {
    // For now, only Excel is available (CSV was removed based on requirements)
    return ['excel'] as const
  }, [])

  /**
   * Debug helper function - call this manually for testing
   */
  const debugExportProcess = useCallback(async (options: ExportOptions) => {
    console.log('🐛 Manual debug session started')
    
    try {
      const rawTimesheets = await fetchTimesheetData(options)
      console.log('📊 Raw timesheets:', rawTimesheets)
      
      const debugResult = ExportDebugger.debugExportData(rawTimesheets, options)
      console.log('🔍 Debug result:', debugResult)
      
      return debugResult
    } catch (error) {
      console.error('❌ Debug session failed:', error)
      throw error
    }
  }, [fetchTimesheetData])

  // Add debugExportProcess to return for manual testing
  const returnValue = useMemo(() => ({
    exportState,
    exportTimesheets,
    validateExportOptions,
    getAvailableFormats,
    // Temporary debug function - remove in production
    debugExportProcess
  }), [exportState, exportTimesheets, validateExportOptions, getAvailableFormats, debugExportProcess])

  return returnValue
}

// Export type for the return value
export type TimesheetExportHook = ReturnType<typeof useTimesheetExport>