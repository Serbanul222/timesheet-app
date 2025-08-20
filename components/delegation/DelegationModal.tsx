// FILE: components/delegation/DelegationModal.tsx - With EuropeanDateInput
'use client'

import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { EuropeanDateInput } from '@/components/ui/EuropeanDateInput'
import { useDelegation } from '@/hooks/delegation/useDelegation'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
import { DELEGATION_CONSTANTS, DELEGATION_MESSAGES } from '@/types/delegation'
import { toast } from 'sonner'

const delegationSchema = z.object({
  to_store_id: z.string().min(1, DELEGATION_MESSAGES.INVALID_STORE),
  valid_from: z.string().min(1, 'Data de început este necesară'),
  valid_until: z.string().min(1, 'Data de sfârșit este necesară'),
  notes: z.string().optional()
}).refine((data) => new Date(data.valid_until) > new Date(data.valid_from), {
  message: 'Data de sfârșit trebuie să fie după data de început',
  path: ['valid_until']
});

type DelegationFormData = z.infer<typeof delegationSchema>

interface DelegationModalProps {
  employee: EmployeeWithDetails
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function DelegationModal({ employee, isOpen, onClose, onSuccess }: DelegationModalProps) {
  const { availableStores, isLoadingStores, createDelegation, isCreating, getDefaultEndDate } = useDelegation()

  const { 
    control, 
    handleSubmit, 
    formState: { errors }, 
    reset, 
    watch, 
    setValue, 
    setError, 
    clearErrors 
  } = useForm<DelegationFormData>({
    resolver: zodResolver(delegationSchema),
    defaultValues: { to_store_id: '', valid_from: '', valid_until: '', notes: '' }
  });

  const watchedValues = watch()

  const validStores = useMemo(() => {
    return availableStores.filter(store => store.id !== employee.store_id)
  }, [availableStores, employee.store_id]);

  useEffect(() => {
    if (watchedValues.to_store_id === employee.store_id) {
      setError('to_store_id', { type: 'manual', message: `Nu se poate delega la același magazin` })
    } else {
      clearErrors('to_store_id')
    }
  }, [watchedValues.to_store_id, employee.store_id, setError, clearErrors]);

  useEffect(() => {
    if (isOpen) {
      const today = new Date()
      const defaultEnd = getDefaultEndDate()
      setValue('valid_from', today.toISOString().split('T')[0])
      setValue('valid_until', defaultEnd.toISOString().split('T')[0])
    }
  }, [isOpen, setValue, getDefaultEndDate]);

  const onSubmit = async (data: DelegationFormData) => {
    if (data.to_store_id === employee.store_id) {
      setError('to_store_id', { type: 'manual', message: 'Nu se poate delega la același magazin' })
      return
    }

    try {
      await createDelegation({
        employee_id: employee.id,
        to_store_id: data.to_store_id,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        notes: data.notes
      });
      reset();
      
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      toast.error('Delegația nu a putut fi creată')
      console.error('Failed to create delegation:', error)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const duration = useMemo(() => {
    if (!watchedValues.valid_from || !watchedValues.valid_until) return 0
    const start = new Date(watchedValues.valid_from)
    const end = new Date(watchedValues.valid_until)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }, [watchedValues.valid_from, watchedValues.valid_until]);

  // Get minimum date for date inputs
  const getMinFromDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getMinUntilDate = () => {
    return watchedValues.valid_from || getMinFromDate()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Deleagă Angajat</h2>
          <button type="button" onClick={handleClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">{employee.full_name}</h3>
          <p className="text-sm text-gray-600">{employee.position || 'Staff'} • Actualmente la: {employee.store?.name}</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deleagă la Magazin *</label>
            <Controller
              name="to_store_id"
              control={control}
              render={({ field }) => (
                <select 
                  {...field}
                  className={`w-full px-3 py-2 border rounded-md ${errors.to_store_id ? 'border-red-500' : 'border-gray-300'}`} 
                  disabled={isLoadingStores}
                >
                  <option value="">Alegeți magazinul destinație.</option>
                  {validStores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              )}
            />
            {errors.to_store_id && (
              <p className="mt-1 text-sm text-red-600">{errors.to_store_id.message}</p>
            )}
            {validStores.length === 0 && !isLoadingStores && (
              <p className="mt-1 text-sm text-amber-600">Nu există alte magazine disponibile pentru delegare.</p>
            )}
            {availableStores.length > validStores.length && (
              <p className="mt-1 text-xs text-gray-500">Notă: {employee.store?.name} este exclus.</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="valid_from"
              control={control}
              render={({ field }) => (
                <div>
                  <EuropeanDateInput
                    label="De la"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isCreating}
                    required
                    min={getMinFromDate()} 
                  />
                  {errors.valid_from && (
                    <p className="mt-1 text-sm text-red-600">{errors.valid_from.message}</p>
                  )}
                </div>
              )}
            />
            
            <Controller
              name="valid_until"
              control={control}
              render={({ field }) => (
                <div>
                  <EuropeanDateInput
                    label="Până la"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isCreating}
                    required
                    min={getMinUntilDate()}
                  />
                  {errors.valid_until && (
                    <p className="mt-1 text-sm text-red-600">{errors.valid_until.message}</p>
                  )}
                </div>
              )}
            />
          </div>
          
          {duration > 0 && (
            <div className="text-sm bg-blue-50 p-2 rounded">
              Durată: <span className="font-medium">{duration} {duration === 1 ? 'zi' : 'zile'}</span>
              {duration > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS && (
                <span className="text-red-600 ml-2">(Prea lung!)</span>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notițe (Opțional)</label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <textarea 
                  {...field}
                  rows={2} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                  placeholder="Motiv pentru delegare..." 
                />
              )}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Anulează
            </Button>
            <Button 
              type="submit" 
              loading={isCreating} 
              disabled={isCreating || duration > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS || watchedValues.to_store_id === employee.store_id || validStores.length === 0}
            >
              {isCreating ? 'Creare...' : 'Creează Delegație'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}