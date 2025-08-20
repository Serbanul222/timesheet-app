// components/reports/ExportDateRange.tsx
'use client'

import { EuropeanDateInput } from '@/components/ui/EuropeanDateInput'

interface DateRange {
  startDate: string
  endDate: string
}

interface ExportDateRangeProps {
  dateRange: DateRange
  onDateChange: (field: 'startDate' | 'endDate', value: string) => void
  disabled: boolean
}

export function ExportDateRange({ dateRange, onDateChange, disabled }: ExportDateRangeProps) {
  const hasDateRangeError = new Date(dateRange.startDate) > new Date(dateRange.endDate)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Interval de date personalizat
      </label>
      <div className="space-y-3">
        <EuropeanDateInput
          label="Data început"
          value={dateRange.startDate}
          onChange={(date) => onDateChange('startDate', date)}
          disabled={disabled}
          required
        />
        <EuropeanDateInput
          label="Data sfârșit"
          value={dateRange.endDate}
          onChange={(date) => onDateChange('endDate', date)}
          disabled={disabled}
          required
        />
      </div>
      {hasDateRangeError && (
        <p className="mt-2 text-xs text-red-500">
          Data de început trebuie să fie înaintea datei de sfârșit.
        </p>
      )}
    </div>
  )
}