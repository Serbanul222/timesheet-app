// components/timesheets/TimesheetGrid.tsx - FINAL AND CORRECTED
'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { TimesheetGridHeader } from './TimesheetGridHeader'
import { TimesheetGridRow } from './TimesheetGridRow'
import { TimesheetGridFooter } from './TimesheetGridFooter'
import { SaveStatusDisplay } from './SaveStatusDisplay'
import { type TimesheetGridData, type TimesheetEntry, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange, calculateTotalHours, formatDateLocal, parseTimeInterval } from '@/lib/timesheet-utils'
import { AbsenceHoursRules } from '@/lib/validation/absenceHoursRules'
import { useTimesheetSave } from '@/hooks/timesheet/useTimesheetSave'
import { useGridValidation } from '@/hooks/validation/useGridValidation'
import { TimesheetCreator } from './TimesheetCreator'
import { DuplicationModal } from './DuplicationModal'
import { useRomanianHolidays } from '@/lib/services/romanianHolidays'
import { formatDateForInput } from '@/lib/utils/dateFormatting'
import { TimesheetSaveService, type EnhancedSaveOptions } from '@/lib/services/timesheetSaveService'
import { useAuth } from '@/hooks/auth/useAuth'
import { toast } from 'sonner'
import { useAbsenceTypes } from '@/hooks/validation/useAbsenceTypes'

export interface ColumnWidths {
  employeeName: number
  position: number
  dateColumns: Record<string, number>
  total: number
}

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
  const { absenceTypes } = useAbsenceTypes()

  const handleGridCreate = useCallback(async (creatorData: {
    startDate: Date, endDate: Date, storeId: string,
    employees: Array<{ id: string; name: string; position?: string }>,
    forceDuplicateCreation?: boolean
  }) => {
    setIsCreating(true)
    try {
      const dateRange = generateDateRange(creatorData.startDate, creatorData.endDate);
      const now = new Date().toISOString();
      const newEntries: TimesheetEntry[] = creatorData.employees.map(emp => ({ 
        employeeId: emp.id, 
        employeeName: emp.name, 
        position: emp.position || 'Staff', 
        days: dateRange.reduce((acc, date) => { 
          const dateKey = formatDateLocal(date); 
          acc[dateKey] = { hours: 0, status: 'alege', notes: '', timeInterval: '' }; 
          return acc; 
        }, {} as Record<string, any>) 
      }));
      const newGridData: TimesheetGridData = { 
        startDate: formatDateForInput(creatorData.startDate), 
        endDate: formatDateForInput(creatorData.endDate), 
        storeId: creatorData.storeId, 
        entries: newEntries, 
        createdAt: now, 
        updatedAt: now 
      };
      const saveOptions: EnhancedSaveOptions = { 
        gridSessionId: `grid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
        createdBy: profile?.id || 'unknown', 
        skipDuplicationCheck: creatorData.forceDuplicateCreation || false 
      }
      const result = await TimesheetSaveService.saveTimesheetGrid(newGridData, saveOptions, false)
      if (result.success) {
        toast.success(`Pontaj creat cu succes pentru ${creatorData.employees.length} angajați`)
        const createdGridData = { ...newGridData, id: result.savedTimesheets[0]?.timesheetId || '' }
        onDataChange(createdGridData)
        onSaveSuccess()
      } else {
        const errorMessage = result.errors.length > 0 ? result.errors[0].error : 'Eroare necunoscută la salvare'
        toast.error(`Eroare la crearea pontajului: ${errorMessage}`)
      }
    } catch (error) {
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

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({ employeeName: 160, position: 96, dateColumns: {}, total: 64 });
  
  useEffect(() => {
    const saved = localStorage.getItem('timesheetColumnWidths');
    const loadedWidths = saved ? JSON.parse(saved) : {};
    setColumnWidths(prev => {
      const newDateColumns = { ...loadedWidths.dateColumns };
      let hasChanged = false;
      dateRange.forEach(date => { 
        const dateKey = formatDateLocal(date); 
        if (!newDateColumns[dateKey]) { 
          newDateColumns[dateKey] = 48; 
          hasChanged = true; 
        } 
      });
      const finalWidths = { 
        employeeName: loadedWidths.employeeName || prev.employeeName, 
        position: loadedWidths.position || prev.position, 
        total: loadedWidths.total || prev.total, 
        dateColumns: newDateColumns 
      };
      if (hasChanged) { 
        localStorage.setItem('timesheetColumnWidths', JSON.stringify(finalWidths)); 
      }
      return finalWidths;
    });
  }, [dateRange]);


  useEffect(() => {
  if (!data || !absenceTypes.length) return;
  
  let hasConflicts = false;
  const cleanedEntries = data.entries.map(entry => {
    const cleanedDays = { ...entry.days };
    
    for (const date in cleanedDays) {
      const dayData = cleanedDays[date];
      if (dayData && AbsenceHoursRules.isFullDayAbsence(dayData.status, absenceTypes)) {
        if (dayData.timeInterval || dayData.hours > 0) {
          cleanedDays[date] = AbsenceHoursRules.getFullDayAbsenceData(dayData.status, dayData.notes);
          hasConflicts = true;
        }
      }
    }
    return { ...entry, days: cleanedDays };
  });
  
  if (hasConflicts) {
    onDataChange({ entries: cleanedEntries, updatedAt: new Date().toISOString() });
  }
}, [data, absenceTypes, onDataChange]);

  const handleColumnResize = useCallback((columnType: keyof ColumnWidths | string, newWidth: number) => {
    setColumnWidths(prev => {
      const newColumnWidths = { ...prev };
      if (['employeeName', 'position', 'total'].includes(columnType)) { 
        newColumnWidths[columnType as 'employeeName' | 'position' | 'total'] = newWidth 
      } else { 
        newColumnWidths.dateColumns = { ...newColumnWidths.dateColumns, [columnType]: newWidth } 
      }
      localStorage.setItem('timesheetColumnWidths', JSON.stringify(newColumnWidths));
      return newColumnWidths;
    });
  }, []);

  const [selectedCell, setSelectedCell] = useState<{ employeeId: string; date: string } | null>(null)
  const { validationResult, getValidationSummary, getErrorsByEmployee, getSetupErrors, hasBasicSetup, isValidating } = useGridValidation(data)

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
      onSaveSuccess()
    },
    onPartialSuccess: (result) => {
    }
  })
  
  const canSave = canSaveService && validationResult.canSave && !isValidating

  const handleModalClose = () => {
    clearDuplicateInfo();
    clearLastResult();
  };

  const handleModalEditExisting = () => {
    const timesheetId = duplicateInfo?.duplicationCheck?.existingTimesheet?.id;
    if (timesheetId && onEditExistingTimesheet) {
      onEditExistingTimesheet(timesheetId);
      handleModalClose();
    }
  };

  const handleModalCreateDifferent = () => {
    toast.info('Modificați perioada sau magazinul pentru a salva un pontaj nou.');
    handleModalClose();
  };

  // NEW: Enhanced updateCell with automatic full-day absence handling
  const updateCell = useCallback((employeeId: string, date: string, field: 'timeInterval' | 'status' | 'notes', value: string | DayStatus) => {
    if (readOnly || !data) return;

    const newEntries = data.entries.map(entry => {
      if (entry.employeeId !== employeeId) return entry;

      const newDays = { ...entry.days };
      const dayData = newDays[date] || { hours: 0, status: 'alege', notes: '', timeInterval: '' };
      const updatedDay = { ...dayData };

      if (field === 'timeInterval') {
        updatedDay.timeInterval = value as string;
        updatedDay.hours = parseTimeInterval(value as string);
      } else if (field === 'status') {
        const newStatus = value as DayStatus;
        updatedDay.status = newStatus;
        
        // NEW: Automatically handle full-day absences
        if (AbsenceHoursRules.isFullDayAbsence(newStatus, absenceTypes)) {
          const fullDayData = AbsenceHoursRules.getFullDayAbsenceData(newStatus, updatedDay.notes);
          Object.assign(updatedDay, fullDayData);
        }
      } else {
        updatedDay.notes = value as string;
      }

      newDays[date] = updatedDay;
      return { ...entry, days: newDays };
    });

    onDataChange({ entries: newEntries, updatedAt: new Date().toISOString() });
  }, [readOnly, data, onDataChange, absenceTypes]);

  const employeeTotals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc[entry.employeeId] = calculateTotalHours(entry.days, absenceTypes);
      return acc
    }, {} as Record<string, number>)
  }, [entries, absenceTypes]);

  // NEW: Updated dailyTotals using centralized rule
  const dailyTotals = useMemo(() => {
    return dateRange.reduce((acc, date) => {
      const dateKey = formatDateLocal(date);
      acc[dateKey] = entries.reduce((sum, entry) => {
        const dayData = entry.days[dateKey];
        if(dayData) {
          const effectiveHours = AbsenceHoursRules.calculateEffectiveHours(dayData, absenceTypes);
          return sum + effectiveHours.hours;
        }
        return sum;
      }, 0);
      return acc
    }, {} as Record<string, number>)
  }, [entries, dateRange, absenceTypes]);

  const handleSave = async () => { 
    if (readOnly || !canSave) return; 
    try { 
      const enrichedData = { ...data, storeId: data.storeId || undefined, zoneId: data.zoneId || undefined }; 
      await saveTimesheet(enrichedData) 
    } catch (error) { 
      console.error('Grid save failed:', error) 
    } 
  }

  const handleCellSelect = (employeeId: string, date: string) => { 
    setSelectedCell({ employeeId, date }) 
  }

  return (
    <>
      <div className={`timesheet-grid bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        {validationResult.setupErrorCount > 0 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">Completează setările de bază înainte de a salva</h3>
                <div className="mt-1 text-sm text-blue-700">
                  {getSetupErrors().map((error, index) => (
                    <p key={index}>• {error.error}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {hasBasicSetup() && (!validationResult.isValid || validationResult.warningCount > 0) && ( 
          <div className="p-4 border-b border-gray-200">
            {/* Validation warnings display */}
          </div> 
        )}
        
        {lastSaveResult && !duplicateInfo && (
          <div className="p-4 border-b border-gray-200">
            <SaveStatusDisplay result={lastSaveResult} onDismiss={clearLastResult} />
          </div>
        )}
        
        {data.entries.length > 0 && hasBasicSetup() ? (
          <>
            <div className="overflow-x-auto overflow-y-visible">
              <div style={{ minWidth: 'max-content' }}>
                <TimesheetGridHeader 
                  dateRange={dateRange} 
                  dailyTotals={dailyTotals} 
                  columnWidths={columnWidths} 
                  onColumnResize={handleColumnResize} 
                  holidays={holidays} 
                />
                <div className="timesheet-grid-body">
                  {data.entries.map((entry) => (
                    <TimesheetGridRow 
                      key={entry.employeeId} 
                      entry={entry} 
                      dateRange={dateRange} 
                      totalHours={employeeTotals[entry.employeeId]} 
                      selectedCell={selectedCell} 
                      readOnly={readOnly} 
                      onCellSelect={handleCellSelect} 
                      onUpdateCell={updateCell} 
                      columnWidths={columnWidths} 
                      holidays={holidays} 
                    />
                  ))}
                </div>
              </div>
            </div>
            <TimesheetGridFooter 
              totalHours={Object.values(employeeTotals).reduce((sum, hours) => sum + hours, 0)} 
              employeeCount={data.entries.length} 
              onSave={handleSave} 
              onCancel={onCancel} 
              isSaving={isSaving || isCreating} 
              readOnly={readOnly} 
              canSave={canSave} 
              validationSummary={getValidationSummary()} 
              hasValidationErrors={!validationResult.isValid && hasBasicSetup()} 
              hasSetupErrors={!hasBasicSetup()} 
            />
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="text-gray-500">
              <p>Pontajul este gol. Adaugă angajați pentru a începe.</p>
            </div>
          </div>
        )}
      </div>

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