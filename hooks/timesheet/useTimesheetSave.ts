// hooks/timesheet/useTimesheetSave.ts - Corrected and Final
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { TimesheetSaveService, SaveResult } from '@/lib/services/timesheetSaveService'
import { TimesheetGridData } from '@/types/timesheet-grid'
import { useSaveResultHandler, SaveResultHandlerOptions } from './useSaveResultHandler'
import { toast } from 'sonner'

// ✅ THE FIX: Import the timezone-safe date formatting function.
import { formatDateForInput } from '@/lib/utils/dateFormatting';

export interface TimesheetSaveOptions extends SaveResultHandlerOptions {
  gridId?: string // Optional grid identifier for session consistency
}

export function useTimesheetSave(options: TimesheetSaveOptions = {}) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null)
  
  const { handleSaveResult, handleSaveError } = useSaveResultHandler(options)

  const persistentSessionId = useMemo(() => {
    const gridId = options.gridId || 'default'
    return `grid-${gridId}-${Date.now()}`
  }, [options.gridId])

  const saveTimesheet = useCallback(async (gridData: TimesheetGridData): Promise<SaveResult | null> => {
    if (!user) {
      const error = new Error('User not authenticated')
      handleSaveError(error)
      return null
    }

    if (isSaving) {
      toast.warning('Save already in progress')
      return null
    }

    setIsSaving(true)
    
    try {
      // ✅ THE FIX: Create a sanitized copy of gridData with clean, timezone-free date strings.
      // This step is crucial because the gridData coming from the UI state can have
      // full ISO strings with timezone information (e.g., "...T22:00:00.000Z").
      // By formatting them to 'YYYY-MM-DD', we remove all ambiguity before saving.
      const cleanGridData: TimesheetGridData = {
        ...gridData,
        startDate: formatDateForInput(gridData.startDate),
        endDate: formatDateForInput(gridData.endDate),
      };

      const saveOptions = {
        createdBy: user.id,
        gridSessionId: persistentSessionId,
        gridTitle: `Timesheet for ${gridData.entries[0]?.employeeName} and ${gridData.entries.length - 1} others`
      }

      // Pass the CLEAN data to the save service.
      const result = await TimesheetSaveService.saveTimesheetGrid(cleanGridData, saveOptions)
      
      setLastSaveResult(result)
      handleSaveResult(result)
      
      return result

    } catch (error) {
      console.error('useTimesheetSave: Save failed:', error)
      const err = error instanceof Error ? error : new Error('An unexpected error occurred during save')
      handleSaveError(err)
      return null
      
    } finally {
      setIsSaving(false)
    }
  }, [user, isSaving, persistentSessionId, handleSaveResult, handleSaveError])

  const clearLastResult = useCallback(() => {
    setLastSaveResult(null)
  }, [])

  return {
    saveTimesheet,
    isSaving,
    lastSaveResult,
    clearLastResult,
    canSave: !!user && !isSaving,
    sessionId: persistentSessionId
  }
}