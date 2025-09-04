// components/reports/ExportPanel.tsx - Updated to remove period selector
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTimesheetExport } from '@/hooks/useTimesheetExport'

// Import sub-components
import { ExportPanelHeader } from './ExportPanelHeader'
import { ExportDateRange } from './ExportDateRange'
import { ExportConfigPanel } from './ExportConfigPanel'
import { ExportActionPanel } from './ExportActionPanel'

//================================================================================
// TYPES (Updated for Excel only)
//================================================================================
type ExportFormat = 'excel'; // Type is now fixed
interface DateRange { startDate: string; endDate: string; }
interface ExportPanelProps { userRole: string; }

const downloadFile = (buffer: ArrayBuffer, filename: string, mimeType: string) => {
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log(`📥 Download triggered for ${filename}`);
};

//================================================================================
// MAIN CONTROLLER COMPONENT
//================================================================================
export default function ExportPanel({ userRole }: ExportPanelProps) {
  const { exportState, exportTimesheets, validateExportOptions, getAvailableFormats } = useTimesheetExport()
  
  // State management - removed selectedPeriodIndex since we removed period selector
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' })
  const [options, setOptions] = useState({ includeNotes: true, includeEmptyDays: false })
  const [customFilename, setCustomFilename] = useState('')

  const availableFormats = useMemo(() => getAvailableFormats(userRole), [getAvailableFormats, userRole])

  useEffect(() => {
    // Set default to current week instead of current month
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate start of week (Monday)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1))
    
    // Calculate end of week (Sunday)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    setDateRange({
      startDate: startOfWeek.toISOString().split('T')[0] ?? '',
      endDate: endOfWeek.toISOString().split('T')[0] ?? ''
    })
  }, [])

  const handleCustomDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleOptionChange = useCallback((option: keyof typeof options, value: boolean) => {
    setOptions(prev => ({ ...prev, [option]: value }))
  }, [])

  const handleExport = useCallback(async () => {
    const exportOptions = {
      dateRange,
      includeNotes: options.includeNotes,
      includeEmptyDays: options.includeEmptyDays,
      ...(customFilename.trim() && { filename: customFilename.trim() })
    };
    
    const errors = validateExportOptions(exportOptions)
    if (errors.length > 0) {
      console.error(`Invalid options: ${errors.join(', ')}`)
      return
    }

    const result = await exportTimesheets(exportOptions)
    
    if (result.success && result.data) {
      downloadFile(result.data.buffer, result.data.filename, result.data.mimeType);
    } else {
      console.error("Export process failed:", result.error);
    }
  }, [dateRange, options, customFilename, validateExportOptions, exportTimesheets])

  const isExportDisabled = useMemo(() => (
    exportState.isLoading ||
    !dateRange.startDate ||
    !dateRange.endDate ||
    new Date(dateRange.startDate) > new Date(dateRange.endDate)
  ), [exportState.isLoading, dateRange])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-6xl mx-auto">
      <ExportPanelHeader
        onRefresh={() => window.location.reload()}
        isLoading={exportState.isLoading}
        lastExport={exportState.lastExport}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - only date range now */}
        <div className="space-y-6">
          <ExportDateRange
            dateRange={dateRange}
            onDateChange={handleCustomDateChange}
            disabled={exportState.isLoading}
          />
        </div>
        
        {/* Middle column - configuration */}
        <ExportConfigPanel
          availableFormats={availableFormats}
          selectedFormat={'excel'} // Hardcoded
          onFormatSelect={() => {}} // No-op, selection is disabled
          options={options}
          onOptionChange={handleOptionChange}
          onFilenameChange={setCustomFilename}
          disabled={exportState.isLoading}
        />
        
        {/* Right column - action panel */}
        <ExportActionPanel
          exportState={exportState}
          onExport={handleExport}
          disabled={isExportDisabled}
          format={'excel'} // Hardcoded
          dateRange={dateRange}
          options={options}
        />
      </div>
    </div>
  )
}