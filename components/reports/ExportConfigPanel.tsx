// components/reports/ExportConfigPanel.tsx
'use client'

import { Input } from '@/components/ui/Input'
import { FileSpreadsheet, FileText, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ExportFormat = 'excel' | 'csv'

interface ExportConfigPanelProps {
  availableFormats: readonly ExportFormat[]
  selectedFormat: ExportFormat
  onFormatSelect: (format: ExportFormat) => void
  options: { includeNotes: boolean; includeEmptyDays: boolean }
  onOptionChange: (option: 'includeNotes' | 'includeEmptyDays', value: boolean) => void
  onFilenameChange: (value: string) => void
  disabled: boolean
}

export function ExportConfigPanel({
  availableFormats,
  selectedFormat,
  onFormatSelect,
  options,
  onOptionChange,
  onFilenameChange,
  disabled
}: ExportConfigPanelProps) {
  const formatDetails = {
    excel: {
      icon: <FileSpreadsheet className="h-5 w-5 text-green-600" />,
      desc: 'Format grilă cu intervale de timp'
    },
    csv: {
      icon: <FileText className="h-5 w-5 text-blue-600" />,
      desc: 'Valori simple separate prin virgulă'
    }
  } as const

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Format export
        </label>
        <div className="space-y-3">
          {availableFormats.map(format => (
            <button
              key={format}
              onClick={() => onFormatSelect(format)}
              disabled={disabled}
              className={cn(
                'w-full p-4 border rounded-lg flex items-center gap-3 text-left transition-colors disabled:opacity-50',
                selectedFormat === format
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {formatDetails[format].icon}
              <div className="flex-1">
                <div className="font-medium capitalize">{format}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDetails[format].desc}
                </div>
              </div>
              {selectedFormat === format && (
                <CheckCircle className="h-5 w-5 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Opțiuni export
        </label>
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={options.includeNotes}
              onChange={e => onOptionChange('includeNotes', e.target.checked)}
              disabled={disabled}
              className="mt-0.5 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Include note
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Include notele angajaților
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={options.includeEmptyDays}
              onChange={e => onOptionChange('includeEmptyDays', e.target.checked)}
              disabled={disabled}
              className="mt-0.5 rounded"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Include zile goale
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Include zilele fără ore înregistrate
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Custom Filename */}
      <div>
        <Input
          label="Nume fișier personalizat (opțional)"
          placeholder="Lăsați gol pentru nume generat automat"
          onChange={e => onFilenameChange(e.target.value)}
          disabled={disabled}
          helperText="Nu includeți extensia fișierului."
        />
      </div>
    </div>
  )
}