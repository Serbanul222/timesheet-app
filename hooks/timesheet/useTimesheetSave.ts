// hooks/timesheet/useTimesheetSave.ts - REWRITTEN FOR COPY-PASTE
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
// Ensure the correct SaveResult type is imported, which includes the optional duplicationCheck property
import { TimesheetSaveService, EnhancedSaveResult as SaveResult } from '@/lib/services/timesheetSaveService'
import { TimesheetGridData } from '@/types/timesheet-grid'
import { useSaveResultHandler, SaveResultHandlerOptions } from './useSaveResultHandler'
import { formatDateForInput } from '@/lib/utils/dateFormatting'
import { toast } from 'sonner'

export interface TimesheetSaveOptions extends SaveResultHandlerOptions {
  gridId?: string
  // This callback is no longer used by the hook itself but is kept for potential other uses
  onDuplicateFound?: (result: SaveResult) => void
  onDuplicateIgnored?: () => void
}

export function useTimesheetSave(options: TimesheetSaveOptions = {}) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null)
  
  // This state is the primary communication channel to the UI (TimesheetGrid) for showing the modal
  const [duplicateInfo, setDuplicateInfo] = useState<SaveResult | null>(null)
  
  const { handleSaveResult, handleSaveError } = useSaveResultHandler(options)

  const persistentSessionId = useMemo(() => {
    const gridId = options.gridId || 'default'
    return `grid-${gridId}-${Date.now()}`
  }, [options.gridId])

  const saveTimesheet = useCallback(async (
    gridData: TimesheetGridData,
    skipDuplicationCheck = false
  ): Promise<SaveResult | null> => {
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
    setDuplicateInfo(null) // Reset duplication state on every new save attempt
    
    try {
      const cleanGridData: TimesheetGridData = {
        ...gridData,
        startDate: formatDateForInput(gridData.startDate),
        endDate: formatDateForInput(gridData.endDate),
      }

      const saveOptions = {
        createdBy: user.id,
        gridSessionId: persistentSessionId,
        gridTitle: `Timesheet for ${gridData.entries[0]?.employeeName} and ${gridData.entries.length - 1} others`,
        skipDuplicationCheck
      }

      const result = await TimesheetSaveService.saveTimesheetGrid(cleanGridData, saveOptions)
      
      setLastSaveResult(result)

      // THE CORE CHANGE: If a duplicate is found, we DO NOT show a toast.
      // We set the `duplicateInfo` state, which the UI component (TimesheetGrid) will use to trigger the modal.
      if (!result.success && result.duplicationCheck?.hasDuplicate) {
        console.log('🚫 useTimesheetSave: Duplicate detected. Setting state for modal display.');
        setDuplicateInfo(result);
        
        options.onDuplicateFound?.(result);
        
        return result; // End the function here, returning the failure result.
      }

      // For any other result (success or other types of failure), handle it normally.
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
  }, [user, isSaving, persistentSessionId, handleSaveResult, handleSaveError, options])

  const forceSave = useCallback(async (gridData: TimesheetGridData): Promise<SaveResult | null> => {
    console.log('🔄 Force saving timesheet (ignoring duplicates)')
    options.onDuplicateIgnored?.()
    return saveTimesheet(gridData, true) // Skip duplication check
  }, [saveTimesheet, options])
  
  const clearDuplicateInfo = useCallback(() => {
    setDuplicateInfo(null)
  }, [])
  
  // PRESERVED LOGIC
  const checkDuplication = useCallback(async (gridData: TimesheetGridData) => {
    if (!gridData.storeId || !gridData.entries.length) {
      return { hasDuplicate: false }
    }
    try {
      return await TimesheetSaveService.checkDuplication(
        gridData.storeId,
        formatDateForInput(gridData.startDate),
        formatDateForInput(gridData.endDate),
        gridData.entries,
        gridData.id
      )
    } catch (error) {
      console.error('Duplication check failed:', error)
      return { hasDuplicate: false }
    }
  }, [])

  // PRESERVED LOGIC
  const clearLastResult = useCallback(() => {
    setLastSaveResult(null)
  }, [])

  return {
    saveTimesheet,
    isSaving,
    lastSaveResult,
    clearLastResult,
    canSave: !!user && !isSaving,
    sessionId: persistentSessionId,
    
    // The UI component will use these to manage the modal
    duplicateInfo,
    clearDuplicateInfo,

    forceSave,
    checkDuplication,
    hasDuplicate: !!duplicateInfo?.duplicationCheck?.hasDuplicate
  }
}