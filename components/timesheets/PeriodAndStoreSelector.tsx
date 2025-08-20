'use client'

import { useState, useEffect } from 'react'
import { formatDateEuropean, formatDateForInput } from '@/lib/utils/dateFormatting'
import { getDaysCount } from '@/lib/timesheet-utils'
import { type TimesheetGridData } from '@/types/timesheet-grid'

// ✅ Import the new SearchableSelect component
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface Store {
  id: string
  name: string
  zone_id: string
}

interface PeriodAndStoreSelectorProps {
  timesheetData: Pick<TimesheetGridData, 'startDate' | 'endDate' | 'storeId'>
  stores: Store[]
  onUpdate: (data: Partial<TimesheetGridData>) => void
  isSaving: boolean
  isLoadingStores: boolean
  isStoreManager: boolean
}

export function PeriodAndStoreSelector({
  timesheetData,
  stores,
  onUpdate,
  isSaving,
  isLoadingStores,
  isStoreManager,
}: PeriodAndStoreSelectorProps) {
  const [manualStartDate, setManualStartDate] = useState('')
  const [manualEndDate, setManualEndDate] = useState('')

  useEffect(() => {
    if (timesheetData.startDate) setManualStartDate(formatDateEuropean(timesheetData.startDate))
    if (timesheetData.endDate) setManualEndDate(formatDateEuropean(timesheetData.endDate))
  }, [timesheetData.startDate, timesheetData.endDate])

  // All date handling logic remains unchanged...
  const handlePeriodChange = (field: 'startDate' | 'endDate', value: string) => {
    const date = new Date(value);
    const updates: Partial<TimesheetGridData> = { [field]: date.toISOString() }
    if (field === 'startDate') {
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      updates.endDate = monthEnd.toISOString()
    }
    onUpdate(updates)
  }

  const handleManualDateChange = (field: 'startDate' | 'endDate', value: string) => {
    if (field === 'startDate') setManualStartDate(value); else setManualEndDate(value);
    const parts = value.split('/');
    if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      const [day, month, year] = parts;
      const isoDate = `${year}-${month}-${day}`;
      if (!isNaN(new Date(isoDate).getTime())) handlePeriodChange(field, isoDate);
    }
  }

  const handleDateBlur = (field: 'startDate' | 'endDate') => {
    const originalDate = new Date(timesheetData[field]);
    if (!isNaN(originalDate.getTime())) {
      if (field === 'startDate') setManualStartDate(formatDateEuropean(originalDate));
      else setManualEndDate(formatDateEuropean(originalDate));
    }
  }

  // ✅ This function is now much simpler, just receiving the selected ID
  const handleStoreChange = (storeId: string) => {
    const selectedStore = stores.find(store => store.id === storeId)
    onUpdate({
      storeId: storeId,
      zoneId: selectedStore ? selectedStore.zone_id : undefined,
      entries: [],
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Perioadă & Magazin</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date pickers (unchanged) */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Data început *</label>
          <div className="relative">
            <div className="grid">
              <input type="text" value={manualStartDate} onChange={(e) => handleManualDateChange('startDate', e.target.value)} onBlur={() => handleDateBlur('startDate')} placeholder="DD/MM/YYYY" disabled={isSaving} className="col-start-1 row-start-1 w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              <input type="date" value={formatDateForInput(timesheetData.startDate)} onChange={(e) => e.target.value && handlePeriodChange('startDate', e.target.value)} disabled={isSaving} className="col-start-1 row-start-1 w-full h-full opacity-0 cursor-pointer"/>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Data sfârșit *</label>
          <div className="relative">
            <div className="grid">
              <input type="text" value={manualEndDate} onChange={(e) => handleManualDateChange('endDate', e.target.value)} onBlur={() => handleDateBlur('endDate')} placeholder="DD/MM/YYYY" disabled={isSaving} className="col-start-1 row-start-1 w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              <input type="date" value={formatDateForInput(timesheetData.endDate)} onChange={(e) => e.target.value && handlePeriodChange('endDate', e.target.value)} disabled={isSaving} className="col-start-1 row-start-1 w-full h-full opacity-0 cursor-pointer"/>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
          </div>
        </div>
        
        {/* ✅ START: Use the new SearchableSelect component */}
        <SearchableSelect
          label="Magazin *"
          options={stores.map(store => ({ value: store.id, label: store.name }))}
          value={timesheetData.storeId}
          onChange={handleStoreChange}
          placeholder="Selectează magazin..."
          isLoading={isLoadingStores}
          isDisabled={isStoreManager || isSaving}
        />
        {/* ✅ END */}
        
      </div>
    </div>
  )
}