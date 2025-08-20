// components/reports/ExportPeriodSelector.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'
import { cn } from '@/lib/utils'

interface TimesheetPeriod {
  start: string
  end: string
  label: string
  count: number
  stores: string[]
}

interface ExportPeriodSelectorProps {
  onPeriodSelect: (period: TimesheetPeriod, index: number) => void
  selectedIndex: number
  disabled: boolean
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  try {
    return formatDateEuropean(dateString)
  } catch {
    return dateString
  }
}

export function ExportPeriodSelector({ onPeriodSelect, selectedIndex, disabled }: ExportPeriodSelectorProps) {
  const [periods, setPeriods] = useState<TimesheetPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadPeriods = useCallback(async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('timesheets')
      .select('period_start, period_end, store:stores(name)')
      .order('period_start', { ascending: false })
      .limit(100)

    if (data) {
      const periodMap = new Map<
        string,
        { start: string; end: string; count: number; stores: Set<string> }
      >()
      
      data.forEach(ts => {
        if (!ts.period_start || !ts.period_end) return
        const key = `${ts.period_start}_${ts.period_end}`
        if (!periodMap.has(key)) {
          periodMap.set(key, {
            start: ts.period_start,
            end: ts.period_end,
            count: 0,
            stores: new Set()
          })
        }
        const period = periodMap.get(key)!
        period.count++
        if (ts.store && typeof ts.store === 'object' && 'name' in ts.store) {
          const storeName = (ts.store as { name: string }).name
          if (storeName && typeof storeName === 'string') {
            period.stores.add(storeName)
          }
        }
      })

      const processedPeriods = Array.from(periodMap.values()).map(p => ({
        ...p,
        label: `${formatDate(p.start)} - ${formatDate(p.end)}`,
        stores: Array.from(p.stores)
      }))
      setPeriods(processedPeriods)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadPeriods()
  }, [loadPeriods])

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        <Calendar className="h-4 w-4 inline mr-2" />
        Perioade disponibile
      </label>
      {isLoading ? (
        <div className="flex items-center justify-center p-6 border rounded-lg">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Se încarcă perioadele...</span>
        </div>
      ) : (
        <div className="border rounded-lg max-h-64 overflow-y-auto">
          {periods.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {periods.map((period, index) => (
                <button
                  key={index}
                  onClick={() => onPeriodSelect(period, index)}
                  disabled={disabled}
                  className={cn(
                    'w-full text-left p-4 hover:bg-blue-50 transition-colors disabled:opacity-50',
                    selectedIndex === index &&
                      'bg-blue-50 border-l-4 border-l-blue-500'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {period.label}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {period.count} foi de pontaj • {period.stores.length} magazine
                      </div>
                    </div>
                    {selectedIndex === index && (
                      <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">
              <p>Nu au fost găsite perioade de pontaj.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}