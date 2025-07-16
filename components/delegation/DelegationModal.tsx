// components/delegation/DelegationModal.tsx - Fixed & Shortened
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
    setValue
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

  // Set default dates when modal opens - FIX: Use today as minimum date
  useEffect(() => {
    if (isOpen) {
      const today = new Date()
      const defaultEnd = getDefaultEndDate()
      
      // Set to today (not tomorrow) to avoid timezone issues
      setValue('valid_from', today.toISOString().split('T')[0])
      setValue('valid_until', defaultEnd.toISOString().split('T')[0])
    }
  }, [isOpen, setValue, getDefaultEndDate])

  const onSubmit = async (data: DelegationFormData) => {
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
          <h2 className="text-xl font-bold text-gray-900">Deleagă un angajat</h2>
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
            {employee.position || 'Staff'} • {employee.store?.name}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Destination Store */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Către magazinul *
            </label>
            <select
              {...register('to_store_id')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${
                errors.to_store_id ? 'border-red-500' : ''
              }`}
              disabled={isLoadingStores}
            >
              <option value="">Selectează magazin</option>
              {availableStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {errors.to_store_id && (
              <p className="mt-1 text-sm text-red-600">{errors.to_store_id.message}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="De la *"
              type="date"
              {...register('valid_from')}
              error={errors.valid_from?.message}
              min={new Date().toISOString().split('T')[0]}
            />
            
            <Input
              label="Până la *"
              type="date"
              {...register('valid_until')}
              error={errors.valid_until?.message}
              min={watchedValues.valid_from}
            />
          </div>

          {/* Duration Display */}
          {duration > 0 && (
            <div className="text-sm bg-blue-50 p-2 rounded">
              Durata: <span className="font-medium">{duration} {duration === 1 ? 'zi' : 'zile'}</span>
              {duration > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS && (
                <span className="text-red-600 ml-2">(Prea lung!)</span>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notițe (Opțional)
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="Notițe despre delegare..."
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
              Anulează
            </Button>
            <Button 
              type="submit" 
              loading={isCreating} 
              disabled={isCreating || duration > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS}
            >
              {isCreating ? 'Se creează...' : 'Deplasează'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}