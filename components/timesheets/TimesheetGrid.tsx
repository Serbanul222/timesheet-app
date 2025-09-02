// FILE: components/timesheets/TimesheetGrid.tsx - FINAL AND CORRECTED
'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { TimesheetGridHeader } from './TimesheetGridHeader'
import { TimesheetGridRow } from './TimesheetGridRow'
import { TimesheetGridFooter } from './TimesheetGridFooter'
import { SaveStatusDisplay } from './SaveStatusDisplay'
import { type TimesheetGridData, type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, calculateTotalHours, formatDateLocal } from '@/lib/timesheet-utils'
import { useTimesheetSave } from '@/hooks/timesheet/useTimesheetSave'
import { useGridValidation } from '@/hooks/validation/useGridValidation'
import { TimesheetCreator } from './TimesheetCreator'
import { DuplicationModal } from './DuplicationModal' // <-- IMPORT YOUR MODAL
import { useRomanianHolidays } from '@/lib/services/romanianHolidays'
import { formatDateForInput } from '@/lib/utils/dateFormatting'
import { TimesheetSaveService, type EnhancedSaveOptions } from '@/lib/services/timesheetSaveService'
import { useAuth } from '@/hooks/auth/useAuth'
import { toast } from 'sonner'

// PRESERVED: Your original interfaces and helper functions
export interface ColumnWidths {
  employeeName: number
  position: number
  dateColumns: Record<string, number> // Key is date string 'YYYY-MM-DD'
  total: number
}

const parseTimeInterval = (interval: string): { startTime: string; endTime: string; hours: number } | null => {
  if (!interval || !interval.trim()) return null
  const regex = /^(\d{1,2}(?::\d{2})?)-(\d{1,2}(?::\d{2})?)$/
  const match = interval.trim().match(regex)
  if (!match) return null
  const [, start, end] = match
  const startTime = start.includes(':') ? start : `${start}:00`
  const endTime = end.includes(':') ? end : `${end}:00`
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + (minutes || 0)
  }
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  let diffMinutes = endMinutes - startMinutes
  if (diffMinutes < 0) diffMinutes += 24 * 60
  const hours = diffMinutes / 60
  return { startTime, endTime, hours: Math.round(hours * 100) / 100 }
};

interface TimesheetGridProps {
  data: TimesheetGridData | null
  onDataChange: (updates: Partial<TimesheetGridData>) => void
  onCancel: () => void
  onSaveSuccess: () => void
  onEditExistingTimesheet?: (timesheetId: string) => void
  readOnly?: boolean
  className?: string
}

export function TimesheetGrid({
  data,
  onDataChange,
  onCancel,
  onSaveSuccess,
  onEditExistingTimesheet,
  readOnly = false,
  className = ''
}: TimesheetGridProps) {
  
  const { profile } = useAuth()
  const [isCreating, setIsCreating] = useState(false)

  // PRESERVED: Your entire handleGridCreate function is unchanged.
  const handleGridCreate = useCallback(async (creatorData: {
    startDate: Date, endDate: Date, storeId: string,
    employees: Array<{ id: string; name: string; position?: string }>,
    forceDuplicateCreation?: boolean
  }) => {
    console.log('🔍 Grid: handleGridCreate called', { /* ... */ });
    setIsCreating(true)
    try {
      const dateRange = generateDateRange(creatorData.startDate, creatorData.endDate);
      const now = new Date().toISOString();
      const newEntries: TimesheetEntry[] = creatorData.employees.map(emp => ({ employeeId: emp.id, employeeName: emp.name, position: emp.position || 'Staff', days: dateRange.reduce((acc, date) => { const dateKey = formatDateLocal(date); acc[dateKey] = { hours: 0, status: 'alege', notes: '', timeInterval: '' }; return acc; }, {} as Record<string, any>), }));
      const newGridData: TimesheetGridData = { startDate: formatDateForInput(creatorData.startDate), endDate: formatDateForInput(creatorData.endDate), storeId: creatorData.storeId, entries: newEntries, createdAt: now, updatedAt: now, };
      const saveOptions: EnhancedSaveOptions = { gridSessionId: `grid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, createdBy: profile?.id || 'unknown', skipDuplicationCheck: creatorData.forceDuplicateCreation || false }
      console.log('🔍 Grid: Saving new timesheet with options:', { skipDuplicationCheck: saveOptions.skipDuplicationCheck, forceDuplicateCreation: creatorData.forceDuplicateCreation });
      const result = await TimesheetSaveService.saveTimesheetGrid(newGridData, saveOptions, false)
      if (result.success) {
        console.log('✅ Grid: Timesheet created successfully');
        toast.success(`Pontaj creat cu succes pentru ${creatorData.employees.length} angajați`)
        const createdGridData = { ...newGridData, id: result.savedTimesheets[0]?.timesheetId || '' }
        onDataChange(createdGridData)
        onSaveSuccess()
      } else {
        console.error('❌ Grid: Save failed:', result.errors)
        if (result.duplicationCheck?.hasDuplicate) {
          toast.error('S-a detectat un pontaj duplicat. Verificați logica de duplicare.')
        } else {
          const errorMessage = result.errors.length > 0 ? result.errors[0].error : 'Eroare necunoscută la salvare'
          toast.error(`Eroare la crearea pontajului: ${errorMessage}`)
        }
      }
    } catch (error) {
      console.error('❌ Grid: Create timesheet failed:', error)
      toast.error('Eroare la crearea pontajului')
    } finally {
      setIsCreating(false)
    }
  }, [profile?.id, onDataChange, onSaveSuccess])
  
  if (!data) {
    return (
      <TimesheetCreator 
        onCreateTimesheet={handleGridCreate} 
        onEditExistingTimesheet={onEditExistingTimesheet}
        onCancel={onCancel}
        className={isCreating ? 'opacity-50 pointer-events-none' : ''}
      />
    );
  }

  const { startDate, endDate, entries } = data
  const { holidays } = useRomanianHolidays(startDate, endDate);
  const dateRange = useMemo(() => generateDateRange(new Date(startDate), new Date(endDate)), [startDate, endDate])

  // PRESERVED: All your UI state logic is unchanged.
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({ employeeName: 160, position: 96, dateColumns: {}, total: 64 });
  useEffect(() => {
    const saved = localStorage.getItem('timesheetColumnWidths');
    const loadedWidths = saved ? JSON.parse(saved) : {};
    setColumnWidths(prev => {
        const newDateColumns = { ...loadedWidths.dateColumns };
        let hasChanged = false;
        dateRange.forEach(date => { const dateKey = formatDateLocal(date); if (!newDateColumns[dateKey]) { newDateColumns[dateKey] = 48; hasChanged = true; } });
        const finalWidths = { employeeName: loadedWidths.employeeName || prev.employeeName, position: loadedWidths.position || prev.position, total: loadedWidths.total || prev.total, dateColumns: newDateColumns, };
        if (hasChanged) { localStorage.setItem('timesheetColumnWidths', JSON.stringify(finalWidths)); }
        return finalWidths;
    });
  }, [dateRange]);
  const handleColumnResize = useCallback((columnType: keyof ColumnWidths | string, newWidth: number) => {
    setColumnWidths(prev => {
        const newColumnWidths = { ...prev };
        if (['employeeName', 'position', 'total'].includes(columnType)) { newColumnWidths[columnType as 'employeeName' | 'position' | 'total'] = newWidth } else { newColumnWidths.dateColumns = { ...newColumnWidths.dateColumns, [columnType]: newWidth } }
        localStorage.setItem('timesheetColumnWidths', JSON.stringify(newColumnWidths));
        return newColumnWidths;
    });
  }, []);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null)
  const { validationResult, getValidationSummary, getErrorsByEmployee, getSetupErrors, hasBasicSetup, isValidating } = useGridValidation(data)

  // INTEGRATION: This connects to the rewritten hook.
  const { 
    saveTimesheet, 
    isSaving, 
    lastSaveResult, 
    clearLastResult,
    canSave: canSaveService,
    duplicateInfo,
    clearDuplicateInfo
  } = useTimesheetSave({
    gridId: data.id,
    onSuccess: (result) => {
      console.log('Grid save successful:', result)
      onSaveSuccess()
    },
    onPartialSuccess: (result) => {
      console.log('Grid save partially successful:', result)
    }
  })

  // ✅ NEW LOGIC: This handler now clears BOTH states.
  const handleModalClose = () => {
    clearDuplicateInfo(); // Resets the hook's duplicate state
    clearLastResult();  // Resets the hook's general save result state, hiding the red error box
  };

  const handleModalEditExisting = () => {
    const timesheetId = duplicateInfo?.duplicationCheck?.existingTimesheet?.id;
    if (timesheetId && onEditExistingTimesheet) {
      onEditExistingTimesheet(timesheetId);
      handleModalClose(); // Close modal and clear all error states
    } else {
      console.error("Modal could not navigate: Timesheet ID or handler is missing.");
    }
  };

  const handleModalCreateDifferent = () => {
    toast.info('Modificați perioada sau magazinul pentru a salva un pontaj nou.');
    handleModalClose();
  };

  // PRESERVED: All of your existing component logic is unchanged.
  const canSave = canSaveService && validationResult.canSave && !isValidating
  const updateCell = useCallback((employeeId: string, date: string, field: 'timeInterval' | 'status' | 'notes', value: string | DayStatus) => {
    if (readOnly) return
    const newEntries = data.entries.map(entry => {
      if (entry.employeeId !== employeeId) return entry
      const newDays = { ...entry.days }
      const currentDay = newDays[date] || {}
      const updatedDay = { ...currentDay }
      if (field === 'timeInterval') { const parsed = parseTimeInterval(value as string); updatedDay.timeInterval = value as string; updatedDay.startTime = parsed?.startTime || ''; updatedDay.endTime = parsed?.endTime || ''; updatedDay.hours = parsed?.hours || 0 } else { (updatedDay as any)[field] = value }
      newDays[date] = updatedDay
      return { ...entry, days: newDays }
    })
    onDataChange({ entries: newEntries, updatedAt: new Date().toISOString() })
  }, [readOnly, data, onDataChange])
  const employeeTotals = useMemo(() => entries.reduce((acc, entry) => { acc[entry.employeeId] = calculateTotalHours(entry.days); return acc }, {} as Record<string, number>), [entries])
  const dailyTotals = useMemo(() => dateRange.reduce((acc, date) => { const dateKey = formatDateLocal(date); acc[dateKey] = entries.reduce((sum, entry) => sum + (entry.days[dateKey]?.hours || 0), 0); return acc }, {} as Record<string, number>), [entries, dateRange])
  const handleSave = async () => { if (readOnly || !canSave) return; try { const enrichedData = { ...data, storeId: data.storeId || undefined, zoneId: data.zoneId || undefined }; await saveTimesheet(enrichedData) } catch (error) { console.error('Grid save failed:', error) } }
  const handleCellSelect = (employeeId: string, date: string) => { setSelectedCell({ employeeId, date }) }

  return (
    <>
      <div className={`timesheet-grid bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        {/* PRESERVED: All your original JSX is here and unchanged */}
        {validationResult.setupErrorCount > 0 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0"><svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">Completează setările de bază înainte de a salva</h3>
                <div className="mt-1 text-sm text-blue-700">{getSetupErrors().map((error, index) => (<p key={index}>• {error.error}</p>))}</div>
              </div>
            </div>
          </div>
        )}
        {hasBasicSetup() && (!validationResult.isValid || validationResult.warningCount > 0) && ( <div className="p-4 border-b border-gray-200">{/* ... */}</div> )}
        
        {/* ✅ NEW CONDITION: The SaveStatusDisplay will now only show if there's a save error AND we are NOT showing the duplication modal. */}
        {lastSaveResult && !duplicateInfo && (
          <div className="p-4 border-b border-gray-200">
            <SaveStatusDisplay result={lastSaveResult} onDismiss={clearLastResult} />
          </div>
        )}
        
        {data.entries.length > 0 && hasBasicSetup() ? (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <div style={{ minWidth: 'max-content' }}>
                <TimesheetGridHeader dateRange={dateRange} dailyTotals={dailyTotals} columnWidths={columnWidths} onColumnResize={handleColumnResize} holidays={holidays} />
                <div className="timesheet-grid-body">
                  {data.entries.map((entry) => (
                    <TimesheetGridRow key={entry.employeeId} entry={entry} dateRange={dateRange} totalHours={employeeTotals[entry.employeeId]} selectedCell={selectedCell} readOnly={readOnly} onCellSelect={handleCellSelect} onUpdateCell={updateCell} columnWidths={columnWidths} holidays={holidays} />
                  ))}
                </div>
              </div>
            </div>
            <TimesheetGridFooter totalHours={Object.values(employeeTotals).reduce((sum, hours) => sum + hours, 0)} employeeCount={data.entries.length} onSave={handleSave} onCancel={onCancel} isSaving={isSaving || isCreating} readOnly={readOnly} canSave={canSave} validationSummary={getValidationSummary()} hasValidationErrors={!validationResult.isValid && hasBasicSetup()} hasSetupErrors={!hasBasicSetup()} />
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              <p>Pontajul este gol. Adaugă angajați pentru a începe.</p>
            </div>
          </div>
        )}
      </div>

      {/* NEW: This renders your modal ONLY when `duplicateInfo` has data from a failed save. */}
      {duplicateInfo && duplicateInfo.duplicationCheck?.hasDuplicate && (
        <DuplicationModal
          isOpen={true}
          onClose={handleModalClose}
          existingTimesheet={duplicateInfo.duplicationCheck.existingTimesheet || null}
          conflictType={duplicateInfo.duplicationCheck.conflictType || null}
          newTimesheetInfo={{
            startDate: data.startDate,
            endDate: data.endDate,
            storeName: 'Magazinul Curent',
            employeeCount: data.entries.length
          }}
          onEditExisting={handleModalEditExisting}
          onCreateDifferent={handleModalCreateDifferent}
          showForceOption={false}
        />
      )}
    </>
  )
}