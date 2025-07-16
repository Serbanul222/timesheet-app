// hooks/timesheet/useTimesheetSave.ts - Updated with persistent session ID
'use client'

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { TimesheetSaveService, SaveResult } from '@/lib/services/timesheetSaveService'
import { TimesheetGridData } from '@/types/timesheet-grid'
import { useSaveResultHandler, SaveResultHandlerOptions } from './useSaveResultHandler'

export interface TimesheetSaveOptions extends SaveResultHandlerOptions {
  gridId?: string // Optional grid identifier for session consistency
}

/**
 * Hook for saving timesheet grid data with persistent session ID
 */
export function useTimesheetSave(options: TimesheetSaveOptions = {}) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaveResult, setLastSaveResult] = useState<SaveResult | null>(null)
  
  const { handleSaveResult, handleSaveError } = useSaveResultHandler(options)

  // ✅ NEW: Generate persistent session ID once per grid instance
  const persistentSessionId = useMemo(() => {
    const gridId = options.gridId || 'default'
    return `grid-${gridId}-${Date.now()}`
  }, [options.gridId])

  const saveTimesheet = useCallback(async (gridData: TimesheetGridData): Promise<SaveResult | null> => {
    if (!user) {
      handleSaveError(new Error('User not authenticated'))
      return null
    }

    if (isSaving) {
      console.warn('Save already in progress')
      return null
    }

    setIsSaving(true)
    
    try {
      console.log('Saving timesheet grid:', {
        sessionId: persistentSessionId,
        employees: gridData.entries.length,
        period: `${gridData.startDate} - ${gridData.endDate}`,
        store: gridData.storeId
      })

      // ✅ NEW: Use persistent session ID for all saves in this grid
      const saveOptions = {
        createdBy: user.id,
        gridSessionId: persistentSessionId
      }

      const result = await TimesheetSaveService.saveTimesheetGrid(gridData, saveOptions)
      
      setLastSaveResult(result)
      handleSaveResult(result)
      
      return result

    } catch (error) {
      console.error('useTimesheetSave: Save failed:', error)
      handleSaveError(error instanceof Error ? error : new Error('Save failed'))
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
    sessionId: persistentSessionId // Expose session ID for debugging
  }
}