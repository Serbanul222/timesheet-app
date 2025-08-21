// components/reports/ExportActionPanel.tsx
'use client'

import { Button } from '@/components/ui/Button'
import { Download, Loader2 } from 'lucide-react'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'

type ExportFormat = 'excel' | 'csv'

interface ExportState {
  isLoading: boolean
  progress?: number
  statusText?: string
}

interface DateRange {
  startDate: string
  endDate: string
}

interface ExportActionPanelProps {
  exportState: ExportState
  onExport: () => void
  disabled: boolean
  format: ExportFormat
  dateRange: DateRange
  options: { includeNotes: boolean; includeEmptyDays: boolean }
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    return formatDateEuropean(dateString)
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

export function ExportActionPanel({
  exportState,
  onExport,
  disabled,
  format,
  dateRange,
  options
}: ExportActionPanelProps) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 text-sm">
        <h3 className="font-medium text-blue-900 mb-2">Previzualizare export</h3>
        <div className="flex justify-between">
          <span className="text-blue-700 font-medium">Format:</span>
          <span className="capitalize">{format}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700 font-medium">Perioadă:</span>
          <span className="text-right text-xs">
            {`${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700 font-medium">Zile:</span>
          <span>{getDaysCount(dateRange)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-700 font-medium">Note:</span>
          <span>{options.includeNotes ? 'Da' : 'Nu'}</span>
        </div>
      </div>

      {exportState.isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Se exportă...</span>
            <span className="text-sm text-blue-600">{exportState.progress || 0}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${exportState.progress || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-700 mt-2">{exportState.statusText || 'Se procesează...'}</p>
        </div>
      )}

      <Button
        onClick={onExport}
        disabled={disabled}
        className="w-full"
        size="lg"
        leftIcon={
          exportState.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )
        }
      >
        {exportState.isLoading
          ? `Se generează... ${exportState.progress || 0}%`
          : `Exportă ${format.toUpperCase()}`}
      </Button>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
        <h4 className="font-medium text-gray-900 mb-2">💡 Sugestii pentru export</h4>
        <ul className="space-y-1 text-xs">
          <li>• Selectați o perioadă sau setați un interval de date personalizat pentru export.</li>
          <li>• Intervalele de date mari pot dura câteva momente pentru a fi procesate.</li>
        </ul>
      </div>
    </div>
  )
}