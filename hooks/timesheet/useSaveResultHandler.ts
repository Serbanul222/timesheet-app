// hooks/timesheet/useSaveResultHandler.ts
import { useCallback } from 'react'
import { toast } from 'sonner'
import { SaveResult } from '@/lib/services/timesheetSaveService'

export interface SaveResultHandlerOptions {
  onSuccess?: (result: SaveResult) => void
  onPartialSuccess?: (result: SaveResult) => void
  onFailure?: (result: SaveResult) => void
}

/**
 * Hook to handle timesheet save results with user feedback
 */
export function useSaveResultHandler(options: SaveResultHandlerOptions = {}) {
  const handleSaveResult = useCallback((result: SaveResult) => {
    const { savedCount, failedCount, errors, success } = result

    if (success && failedCount === 0) {
      // Complete success
      toast.success('Timesheet saved successfully!', {
        description: `Saved ${savedCount} employee timesheet${savedCount !== 1 ? 's' : ''}`
      })
      options.onSuccess?.(result)

    } else if (success && failedCount > 0) {
      // Partial success
      toast.warning('Timesheet partially saved', {
        description: `${savedCount} saved, ${failedCount} failed. Check details below.`,
        duration: 6000,
      })
      
      // Show individual error toasts
      errors.forEach(error => {
        toast.error(`Failed to save ${error.employeeName}`, {
          description: error.error,
          duration: 5000,
        })
      })
      
      options.onPartialSuccess?.(result)

    } else {
      // Complete failure
      toast.error('Failed to save timesheet', {
        description: 'No timesheets were saved. Please check the data and try again.',
        duration: 6000,
      })
      options.onFailure?.(result)
    }
  }, [options])

  const handleSaveError = useCallback((error: Error) => {
    console.error('Save operation failed:', error)
    toast.error('Save operation failed', {
      description: error.message || 'An unexpected error occurred',
      duration: 6000,
    })
  }, [])

  return {
    handleSaveResult,
    handleSaveError
  }
}