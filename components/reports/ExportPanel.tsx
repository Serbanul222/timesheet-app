// components/reports/ExportPanel.tsx - Main Controller Component
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTimesheetExport } from '@/hooks/useTimesheetExport'

// Import sub-components
import { ExportPanelHeader } from './ExportPanelHeader'
import { ExportPeriodSelector } from './ExportPeriodSelector'
import { ExportDateRange } from './ExportDateRange'
import { ExportConfigPanel } from './ExportConfigPanel'
import { ExportActionPanel } from './ExportActionPanel'

//================================================================================
// TYPES
//================================================================================

type ExportFormat = 'excel' | 'csv'

interface TimesheetPeriod {
  start: string
  end: string
  label: string
  count: number
  stores: string[]
}

interface DateRange {
  startDate: string
  endDate: string
}

interface ExportPanelProps {
  userRole: string
}

//================================================================================
// MAIN CONTROLLER COMPONENT
//================================================================================

export default function ExportPanel({ userRole }: ExportPanelProps) {
  const { exportState, exportTimesheets, validateExportOptions, getAvailableFormats } = useTimesheetExport()
  
  // State management
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel')
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' })
  const [options, setOptions] = useState({ includeNotes: true, includeEmptyDays: false })
  const [customFilename, setCustomFilename] = useState('')
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(-1)

  // Get available formats based on user role
  const availableFormats = useMemo(
    () => getAvailableFormats(userRole),
    [getAvailableFormats, userRole]
  )

  // Set default date range on mount
  useEffect(() => {
    const today = new Date()
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setDateRange({
      startDate: firstOfMonth.toISOString().split('T')[0] ?? '',
      endDate: today.toISOString().split('T')[0] ?? ''
    })
  }, [])

  // Event handlers
  const handlePeriodSelect = useCallback((period: TimesheetPeriod, index: number) => {
    setDateRange({ startDate: period.start, endDate: period.end })
    setSelectedPeriodIndex(index)
  }, [])

  const handleCustomDateChange = useCallback(
    (field: 'startDate' | 'endDate', value: string) => {
      setDateRange(prev => ({ ...prev, [field]: value }))
      setSelectedPeriodIndex(-1) // Deselect period on manual date change
    },
    []
  )

  const handleOptionChange = useCallback(
    (option: keyof typeof options, value: boolean) => {
      setOptions(prev => ({ ...prev, [option]: value }))
    },
    []
  )

  // Handle export
  const handleExport = useCallback(async () => {
    const baseOptions = {
      dateRange,
      includeNotes: options.includeNotes,
      includeEmptyDays: options.includeEmptyDays
    }
    
    const exportOptions = customFilename.trim() 
      ? { ...baseOptions, filename: customFilename.trim() }
      : baseOptions
    
    const errors = validateExportOptions({ ...exportOptions, format: selectedFormat })
    if (errors.length > 0) {
      console.error(`Opțiuni invalide: ${errors.join(', ')}`)
      return
    }
    await exportTimesheets(selectedFormat, exportOptions)
  }, [dateRange, options, selectedFormat, customFilename, validateExportOptions, exportTimesheets])

  // Calculate if export should be disabled
  const isExportDisabled = useMemo(() => {
    return (
      exportState.isLoading ||
      !dateRange.startDate ||
      !dateRange.endDate ||
      new Date(dateRange.startDate) > new Date(dateRange.endDate)
    )
  }, [exportState.isLoading, dateRange])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-6xl mx-auto">
      <ExportPanelHeader
        onRefresh={() => window.location.reload()}
        isLoading={exportState.isLoading}
        lastExport={exportState.lastExport}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Period Selection & Date Range */}
        <div className="space-y-6">
          <ExportPeriodSelector
            onPeriodSelect={handlePeriodSelect}
            selectedIndex={selectedPeriodIndex}
            disabled={exportState.isLoading}
          />
          <ExportDateRange
            dateRange={dateRange}
            onDateChange={handleCustomDateChange}
            disabled={exportState.isLoading}
          />
        </div>

        {/* Middle Column - Configuration */}
        <ExportConfigPanel
          availableFormats={availableFormats}
          selectedFormat={selectedFormat}
          onFormatSelect={setSelectedFormat}
          options={options}
          onOptionChange={handleOptionChange}
          onFilenameChange={setCustomFilename}
          disabled={exportState.isLoading}
        />

        {/* Right Column - Actions */}
        <ExportActionPanel
          exportState={exportState}
          onExport={handleExport}
          disabled={isExportDisabled}
          format={selectedFormat}
          dateRange={dateRange}
          options={options}
        />
      </div>
    </div>
  )
}