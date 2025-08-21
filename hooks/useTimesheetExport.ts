// hooks/useTimesheetExport.ts - Final Excel-Only Version
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { ExportService } from '@/lib/services/exportService'

interface ExportState {
  isLoading: boolean
  progress: number
  lastExport: {
    timestamp: string
    filename: string
    success: boolean
  } | null
}

interface ExportOptions {
  dateRange: {
    startDate: string
    endDate: string
  }
  format: 'excel' // Type is now fixed
  includeNotes: boolean
  includeEmptyDays: boolean
  filename?: string
}

type ExportFunctionResult = Awaited<ReturnType<typeof ExportService.exportTimesheets>>;

export function useTimesheetExport() {
  const [exportState, setExportState] = useState<ExportState>({
    isLoading: false,
    progress: 0,
    lastExport: null
  })

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const exportTimesheets = useCallback(async (
    options: Omit<ExportOptions, 'format'>
  ): Promise<ExportFunctionResult> => {
    if (!options.dateRange?.startDate || !options.dateRange?.endDate) {
      const errorMsg = 'Date range is required for export';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    const fullOptions: ExportOptions = { ...options, format: 'excel' } // Format is now hardcoded
    setExportState(prev => ({ ...prev, isLoading: true, progress: 0 }))
    
    try {
      console.log('🚀 Starting export:', { format: fullOptions.format, dateRange: fullOptions.dateRange })
      setExportState(prev => ({ ...prev, progress: 25 }))
      
      const { data: timesheetData, error } = await supabase
        .from('timesheets')
        .select(`*, store:stores(id, name), zone:zones(id, name)`)
        .gte('period_end', fullOptions.dateRange.startDate)
        .lte('period_start', fullOptions.dateRange.endDate)
        .order('period_start', { ascending: false })

      if (error) throw new Error(`Failed to fetch timesheet data: ${error.message}`)
      if (!timesheetData || timesheetData.length === 0) throw new Error('No timesheet data found for the selected date range')

      setExportState(prev => ({ ...prev, progress: 50 }))
      
      const result = await ExportService.exportTimesheets(timesheetData, fullOptions)
      if (!result.success) throw new Error(result.error || 'Export generation failed')

      setExportState({
        isLoading: false,
        progress: 100,
        lastExport: {
          timestamp: new Date().toISOString(),
          filename: result.data?.filename || 'export',
          success: true
        }
      })
      
      toast.success(`Export ready for download!`, {
        description: `${result.data?.filename} (${timesheetData.length} timesheets)`
      })
      
      setTimeout(() => setExportState(prev => ({ ...prev, progress: 0 })), 2000)
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Please try again or contact support'
      console.error('❌ Export failed:', error)
      
      setExportState({
        isLoading: false,
        progress: 0,
        lastExport: {
          timestamp: new Date().toISOString(),
          filename: 'export_failed',
          success: false
        }
      })
      
      toast.error('Export failed', { description: errorMessage })
      
      return { success: false, error: errorMessage };
    }
  }, [])

  const validateExportOptions = useCallback((options: Omit<ExportOptions, 'format'>): string[] => {
    const errors: string[] = []
    const startDate = new Date(options.dateRange.startDate)
    const endDate = new Date(options.dateRange.endDate)
    if (isNaN(startDate.getTime())) errors.push('Invalid start date')
    if (isNaN(endDate.getTime())) errors.push('Invalid end date')
    if (startDate > endDate) errors.push('Start date must be before end date')
    const daysDiff = Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff > 366) errors.push('Date range cannot exceed 1 year')
    return errors
  }, [])

  const previewExport = useCallback(async (options: Omit<ExportOptions, 'format'>) => {
    try {
      const { data: timesheetData, error } = await supabase
        .from('timesheets')
        .select(`id, period_start, period_end, total_hours, daily_entries, store:stores(name), zone:zones(name)`)
        .gte('period_end', options.dateRange.startDate)
        .lte('period_start', options.dateRange.endDate)
        .limit(100)
      if (error) throw new Error(`Preview failed: ${error.message}`)
      const totalTimesheets = timesheetData?.length || 0
      const totalHours = timesheetData?.reduce((sum, ts) => sum + (ts.total_hours || 0), 0) || 0
      const employees = new Set<string>()
      timesheetData?.forEach(ts => {
        const entries = ts.daily_entries || {}
        Object.keys(entries).forEach(empId => {
          if (entries[empId]?.name) employees.add(empId)
        })
      })
      return {
        success: true,
        preview: {
          totalTimesheets, totalEmployees: employees.size, totalHours, dateRange: options.dateRange,
          sampleData: timesheetData?.slice(0, 5).map(ts => ({
            id: ts.id, store: ts.store?.name || 'Unknown', period: `${ts.period_start} to ${ts.period_end}`, hours: ts.total_hours || 0
          })) || []
        }
      }
    } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Preview failed' } }
  }, [])

  const getAvailableFormats = useCallback((userRole: string) => {
    // Now only returns 'excel' regardless of role
    return ['excel'] as const
  }, [])

  const estimateExportSize = useCallback(async (options: Omit<ExportOptions, 'format'>) => {
    try {
      const { count, error } = await supabase
        .from('timesheets')
        .select('*', { count: 'exact', head: true })
        .gte('period_end', options.dateRange.startDate)
        .lte('period_start', options.dateRange.endDate)
      if (error) throw error
      const recordCount = count || 0
      const baseSize = recordCount * 150 // Base size per record
      const estimatedSize = Math.round(baseSize * 2.5) // Excel multiplier
      return { recordCount, estimatedSize, formattedSize: formatFileSize(estimatedSize),
        warning: estimatedSize > 10 * 1024 * 1024 ? 'Large export (>10MB) may take several minutes' : undefined
      }
    } catch (error) { return { recordCount: 0, estimatedSize: 0, formattedSize: '0 KB', error: 'Could not estimate size' } }
  }, [formatFileSize])

  return {
    exportState,
    exportTimesheets,
    validateExportOptions,
    previewExport,
    getAvailableFormats,
    estimateExportSize
  }
}