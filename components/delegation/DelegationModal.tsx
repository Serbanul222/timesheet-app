// components/delegation/DelegationModal.tsx - MINIMAL UPDATE: Added same store validation
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useDelegation } from '@/hooks/delegation/useDelegation'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
import { DELEGATION_CONSTANTS, DELEGATION_MESSAGES } from '@/types/delegation'

const delegationSchema = z.object({
  to_store_id: z.string().min(1, DELEGATION_MESSAGES.INVALID_STORE),
  valid_from: z.string().min(1, 'Start date is required'),
  valid_until: z.string().min(1, 'End date is required'),
  notes: z.string().optional()
}).refine((data) => {
  const startDate = new Date(data.valid_from)
  const endDate = new Date(data.valid_until)
  return endDate > startDate
}, {
  message: 'End date must be after start date',
  path: ['valid_until']
})

type DelegationFormData = z.infer<typeof delegationSchema>

interface DelegationModalProps {
  employee: EmployeeWithDetails
  isOpen: boolean
  onClose: () => void
}

export function DelegationModal({ employee, isOpen, onClose }: DelegationModalProps) {
  const {
    availableStores,
    isLoadingStores,
    createDelegation,
    isCreating,
    getDefaultEndDate
  } = useDelegation()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    setError,
    clearErrors
  } = useForm<DelegationFormData>({
    resolver: zodResolver(delegationSchema),
    defaultValues: {
      to_store_id: '',
      valid_from: '',
      valid_until: '',
      notes: ''
    }
  })

  const watchedValues = watch()

  // ✅ NEW: Filter out employee's current store from available stores
  const validStores = useMemo(() => {
    return availableStores.filter(store => {
      // Exclude the employee's current store
      if (store.id === employee.store_id) {
        return false
      }
      return true
    })
  }, [availableStores, employee.store_id])

  // ✅ NEW: Validate store selection in real-time
  const selectedStore = useMemo(() => {
    return availableStores.find(store => store.id === watchedValues.to_store_id)
  }, [availableStores, watchedValues.to_store_id])

  // ✅ NEW: Check if selected store is employee's current store
  useEffect(() => {
    if (watchedValues.to_store_id === employee.store_id) {
      setError('to_store_id', {
        type: 'manual',
        message: `Cannot delegate ${employee.full_name} to their current store`
      })
    } else {
      clearErrors('to_store_id')
    }
  }, [watchedValues.to_store_id, employee.store_id, employee.full_name, setError, clearErrors])

  // Set default dates when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date()
      const defaultEnd = getDefaultEndDate()
      
      setValue('valid_from', today.toISOString().split('T')[0])
      setValue('valid_until', defaultEnd.toISOString().split('T')[0])
    }
  }, [isOpen, setValue, getDefaultEndDate])

  const onSubmit = async (data: DelegationFormData) => {
    // ✅ NEW: Final validation before submission
    if (data.to_store_id === employee.store_id) {
      setError('to_store_id', {
        type: 'manual',
        message: 'Cannot delegate employee to their current store'
      })
      return
    }

    try {
      const request = {
        employee_id: employee.id,
        to_store_id: data.to_store_id,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        notes: data.notes
      }

      await createDelegation(request)
      reset()
      onClose()
    } catch (error) {
      console.error('Failed to create delegation:', error)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Calculate duration
  const duration = useMemo(() => {
    if (!watchedValues.valid_from || !watchedValues.valid_until) return 0
    const start = new Date(watchedValues.valid_from)
    const end = new Date(watchedValues.valid_until)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }, [watchedValues.valid_from, watchedValues.valid_until])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Delegate Employee</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Employee Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">{employee.full_name}</h3>
          <p className="text-sm text-gray-600">
            {employee.position || 'Staff'} • Currently at: {employee.store?.name}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Destination Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
             Deleagă la Magazin *
            </label>
            <select
              {...register('to_store_id')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${
                errors.to_store_id ? 'border-red-500' : ''
              }`}
              disabled={isLoadingStores}
            >
              <option value="">Select destination store</option>
              {/* ✅ UPDATED: Use filtered stores that exclude employee's current store */}
              {validStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {errors.to_store_id && (
              <p className="mt-1 text-sm text-red-600">{errors.to_store_id.message}</p>
            )}
            
            {/* ✅ NEW: Show helpful info when no valid stores */}
            {validStores.length === 0 && !isLoadingStores && (
              <p className="mt-1 text-sm text-amber-600">
                No other stores available for delegation in your zone.
              </p>
            )}
            
            {/* ✅ NEW: Show info about excluded current store */}
            {availableStores.length > validStores.length && (
              <p className="mt-1 text-xs text-gray-500">
                Note: {employee.store?.name} is excluded because {employee.full_name} already works there.
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="From *"
              type="date"
              {...register('valid_from')}
              error={errors.valid_from?.message}
              min={new Date().toISOString().split('T')[0]}
            />
            
            <Input
              label="Until *"
              type="date"
              {...register('valid_until')}
              error={errors.valid_until?.message}
              min={watchedValues.valid_from}
            />
          </div>

          {/* Duration Display */}
          {duration > 0 && (
            <div className="text-sm bg-blue-50 p-2 rounded">
              Duration: <span className="font-medium">{duration} {duration === 1 ? 'day' : 'days'}</span>
              {duration > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS && (
                <span className="text-red-600 ml-2">(Too long!)</span>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Reason for delegation..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={isCreating} 
              disabled={
                isCreating || 
                duration > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS ||
                watchedValues.to_store_id === employee.store_id || // ✅ NEW: Disable if same store
                validStores.length === 0
              }
            >
              {isCreating ? 'Creating...' : 'Create Delegation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}