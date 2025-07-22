// components/reports/ExportPanel.tsx
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Download, FileSpreadsheet, FileText, CheckCircle, AlertCircle, Loader2, Calendar, RefreshCw } from 'lucide-react'
import { useTimesheetExport, ExportState } from '@/hooks/useTimesheetExport'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils' // Assuming you have a cn utility for classnames

//================================================================================
// TYPES & UTILS
//================================================================================

type ExportFormat = 'excel' | 'csv';

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

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateString
  }
}

const getDaysCount = (dateRange: DateRange) => {
  if (!dateRange.startDate || !dateRange.endDate) return 0
  const start = new Date(dateRange.startDate)
  const end = new Date(dateRange.endDate)
  if (start > end) return 0
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

//================================================================================
// SUB-COMPONENTS
//================================================================================

// --- Panel Header ---
const PanelHeader = React.memo(({ onRefresh, isLoading, lastExport }: {
  onRefresh: () => void,
  isLoading: boolean,
  lastExport: ExportState['lastExport']
}) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <Download className="h-6 w-6 text-blue-600" />
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Export Timesheets</h2>
        <p className="text-sm text-gray-600">Select a period and format to export data.</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {lastExport && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {lastExport.success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-red-500" />}
          <span>Last: {new Date(lastExport.timestamp).toLocaleTimeString()}</span>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} leftIcon={<RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />}>
        Refresh
      </Button>
    </div>
  </div>
));
PanelHeader.displayName = 'PanelHeader';


// --- Period Selector ---
const PeriodSelector = React.memo(({ onPeriodSelect, selectedIndex, disabled }: {
  onPeriodSelect: (period: TimesheetPeriod, index: number) => void,
  selectedIndex: number,
  disabled: boolean
}) => {
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPeriods = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('timesheets').select('period_start, period_end, store:stores(name)').order('period_start', { ascending: false }).limit(100);

    if (data) {
      const periodMap = new Map<string, { start: string; end: string; count: number; stores: Set<string> }>();
      data.forEach(ts => {
        if (!ts.period_start || !ts.period_end) return;
        const key = `${ts.period_start}_${ts.period_end}`;
        if (!periodMap.has(key)) {
          periodMap.set(key, { start: ts.period_start, end: ts.period_end, count: 0, stores: new Set() });
        }
        const period = periodMap.get(key)!;
        period.count++;
        if (ts.store?.name) period.stores.add(ts.store.name);
      });

      const processedPeriods = Array.from(periodMap.values()).map(p => ({
        ...p,
        label: `${formatDate(p.start)} - ${formatDate(p.end)}`,
        stores: Array.from(p.stores),
      }));
      setPeriods(processedPeriods);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadPeriods() }, [loadPeriods]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3"><Calendar className="h-4 w-4 inline mr-2" />Available Periods</label>
      {isLoading ? (
        <div className="flex items-center justify-center p-6 border rounded-lg"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Loading periods...</span></div>
      ) : (
        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {periods.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {periods.map((period, index) => (
                <button key={index} onClick={() => onPeriodSelect(period, index)} disabled={disabled} className={cn('w-full text-left p-4 hover:bg-blue-50 transition-colors disabled:opacity-50', selectedIndex === index && 'bg-blue-50 border-l-4 border-l-blue-500')}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{period.label}</div>
                      <div className="text-xs text-blue-600 mt-1">{period.count} timesheets • {period.stores.length} stores</div>
                    </div>
                    {selectedIndex === index && <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm"><p>No timesheet periods found.</p></div>
          )}
        </div>
      )}
    </div>
  );
});
PeriodSelector.displayName = 'PeriodSelector';


// --- Configuration Panel (Middle) ---
const ConfigPanel = React.memo(({ availableFormats, selectedFormat, onFormatSelect, options, onOptionChange, onFilenameChange, disabled }: {
  availableFormats: ExportFormat[],
  selectedFormat: ExportFormat,
  onFormatSelect: (format: ExportFormat) => void,
  options: { includeNotes: boolean, includeEmptyDays: boolean },
  onOptionChange: (option: 'includeNotes' | 'includeEmptyDays', value: boolean) => void,
  onFilenameChange: (value: string) => void,
  disabled: boolean
}) => {
  const formatDetails = {
    excel: { icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />, desc: 'Grid format with time intervals' },
    csv: { icon: <FileText className="h-5 w-5 text-blue-600" />, desc: 'Simple comma-separated values' },
  };

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
        <div className="space-y-3">
          {availableFormats.map(format => (
            <button key={format} onClick={() => onFormatSelect(format)} disabled={disabled} className={cn('w-full p-4 border rounded-lg flex items-center gap-3 text-left transition-colors disabled:opacity-50', selectedFormat === format ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
              {formatDetails[format].icon}
              <div className="flex-1">
                <div className="font-medium capitalize">{format}</div>
                <div className="text-xs text-gray-500 mt-1">{formatDetails[format].desc}</div>
              </div>
              {selectedFormat === format && <CheckCircle className="h-5 w-5 text-blue-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Export Options</label>
        <div className="space-y-4">
          <label className="flex items-start gap-3"><input type="checkbox" checked={options.includeNotes} onChange={e => onOptionChange('includeNotes', e.target.checked)} disabled={disabled} className="mt-0.5 rounded" /><div><span className="text-sm font-medium text-gray-900">Include Notes</span><p className="text-xs text-gray-500 mt-1">Include employee notes in the export.</p></div></label>
          <label className="flex items-start gap-3"><input type="checkbox" checked={options.includeEmptyDays} onChange={e => onOptionChange('includeEmptyDays', e.target.checked)} disabled={disabled} className="mt-0.5 rounded" /><div><span className="text-sm font-medium text-gray-900">Include Empty Days</span><p className="text-xs text-gray-500 mt-1">Include days with no recorded hours.</p></div></label>
        </div>
      </div>

      {/* Custom Filename */}
      <div>
        <Input label="Custom Filename (optional)" placeholder="Leave blank for auto-generated name" onChange={e => onFilenameChange(e.target.value)} disabled={disabled} helptext="Don't include file extension." />
      </div>
    </div>
  );
});
ConfigPanel.displayName = 'ConfigPanel';


// --- Action Panel (Right) ---
const ActionPanel = React.memo(({ exportState, onExport, disabled, format, dateRange, options }: {
  exportState: ExportState,
  onExport: () => void,
  disabled: boolean,
  format: ExportFormat,
  dateRange: DateRange,
  options: { includeNotes: boolean, includeEmptyDays: boolean }
}) => (
  <div className="space-y-6">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
      <h3 className="font-medium text-blue-900 mb-2">Export Preview</h3>
      <div className="flex justify-between"><span className="text-blue-700 font-medium">Format:</span><span className="capitalize">{format}</span></div>
      <div className="flex justify-between"><span className="text-blue-700 font-medium">Period:</span><span className="text-right text-xs">{`${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`}</span></div>
      <div className="flex justify-between"><span className="text-blue-700 font-medium">Days:</span><span>{getDaysCount(dateRange)}</span></div>
      <div className="flex justify-between"><span className="text-blue-700 font-medium">Notes:</span><span>{options.includeNotes ? 'Yes' : 'No'}</span></div>
    </div>

    {exportState.isLoading && (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium text-blue-800">Exporting...</span><span className="text-sm text-blue-600">{exportState.progress}%</span></div>
        <div className="w-full bg-blue-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: `${exportState.progress}%` }}></div></div>
        <p className="text-xs text-blue-700 mt-2">{exportState.statusText}</p>
      </div>
    )}

    <Button onClick={onExport} disabled={disabled} className="w-full" size="lg" leftIcon={exportState.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}>
      {exportState.isLoading ? `Generating... ${exportState.progress}%` : `Export ${format.toUpperCase()}`}
    </Button>

    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
      <h4 className="font-medium text-gray-900 mb-2">💡 Export Tips</h4>
      <ul className="space-y-1 text-xs">
        <li>• Select a period or set a custom date range for your export.</li>
        <li>• Large date ranges may take a few moments to process.</li>
        <li>• Use CSV format for analysis in other software.</li>
      </ul>
    </div>
  </div>
));
ActionPanel.displayName = 'ActionPanel';


//================================================================================
// MAIN COMPONENT
//================================================================================

export default function ExportPanel({ userRole }: { userRole: string }) {
  const { exportState, exportTimesheets, validateExportOptions, getAvailableFormats } = useTimesheetExport();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [options, setOptions] = useState({ includeNotes: true, includeEmptyDays: false });
  const [customFilename, setCustomFilename] = useState('');
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(-1);

  const availableFormats = useMemo(() => getAvailableFormats(userRole), [getAvailableFormats, userRole]);

  // Set default date range on mount
  useEffect(() => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateRange({
      startDate: firstOfMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
  }, []);

  const handlePeriodSelect = useCallback((period: TimesheetPeriod, index: number) => {
    setDateRange({ startDate: period.start, endDate: period.end });
    setSelectedPeriodIndex(index);
  }, []);

  const handleCustomDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setSelectedPeriodIndex(-1); // Deselect period on manual date change
  }, []);

  const handleOptionChange = useCallback((option: keyof typeof options, value: boolean) => {
    setOptions(prev => ({ ...prev, [option]: value }));
  }, []);

  const handleExport = useCallback(async () => {
    const exportOptions = {
      dateRange,
      ...options,
      format: selectedFormat,
      filename: customFilename || undefined,
    };
    const errors = validateExportOptions(exportOptions);
    if (errors.length > 0) {
      // The hook should show a toast, but we can also log it.
      console.error(`Invalid options: ${errors.join(', ')}`);
      return;
    }
    await exportTimesheets(selectedFormat, exportOptions);
  }, [dateRange, options, selectedFormat, customFilename, validateExportOptions, exportTimesheets]);

  const isExportDisabled = useMemo(() => {
    return exportState.isLoading || !dateRange.startDate || !dateRange.endDate || new Date(dateRange.startDate) > new Date(dateRange.endDate);
  }, [exportState.isLoading, dateRange]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-6xl mx-auto">
      <PanelHeader onRefresh={() => {}} isLoading={exportState.isLoading} lastExport={exportState.lastExport} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- Left Column --- */}
        <div className="space-y-6">
          <PeriodSelector onPeriodSelect={handlePeriodSelect} selectedIndex={selectedPeriodIndex} disabled={exportState.isLoading} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Custom Date Range</label>
            <div className="space-y-3">
              <Input label="Start Date" type="date" value={dateRange.startDate} onChange={e => handleCustomDateChange('startDate', e.target.value)} disabled={exportState.isLoading} />
              <Input label="End Date" type="date" value={dateRange.endDate} onChange={e => handleCustomDateChange('endDate', e.target.value)} disabled={exportState.isLoading} />
            </div>
            {new Date(dateRange.startDate) > new Date(dateRange.endDate) && <p className="mt-2 text-xs text-red-500">Start date must be before end date.</p>}
          </div>
        </div>

        {/* --- Middle Column --- */}
        <ConfigPanel
          availableFormats={availableFormats}
          selectedFormat={selectedFormat}
          onFormatSelect={setSelectedFormat}
          options={options}
          onOptionChange={handleOptionChange}
          onFilenameChange={setCustomFilename}
          disabled={exportState.isLoading}
        />

        {/* --- Right Column --- */}
        <ActionPanel
          exportState={exportState}
          onExport={handleExport}
          disabled={isExportDisabled}
          format={selectedFormat}
          dateRange={dateRange}
          options={options}
        />
      </div>
    </div>
  );
}