// components/transfer/TransferModal.tsx
'use client'

import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { EuropeanDateInput } from '@/components/ui/EuropeanDateInput'
import { useTransfer } from '@/hooks/transfer/useTransfer'
import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
import { TransferValidationRules } from '@/lib/validation/transferValidationRules'
import { TRANSFER_CONSTANTS, TRANSFER_MESSAGES } from '@/types/transfer'
import { toast } from 'sonner'

const transferSchema = z.object({
  to_store_id: z.string().min(1, TRANSFER_MESSAGES.INVALID_STORE),
  transfer_date: z.string().min(1, 'Data de transfer este necesară'),
  notes: z.string().optional()
}).refine((data) => {
  const transferDate = new Date(data.transfer_date)
  const validation = TransferValidationRules.validateTransferDate(transferDate)
  return validation.isValid
}, {
  message: 'Data de transfer nu este validă',
  path: ['transfer_date']
})

type TransferFormData = z.infer<typeof transferSchema>

interface TransferModalProps {
  employee: EmployeeWithDetails
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TransferModal({ employee, isOpen, onClose, onSuccess }: TransferModalProps) {
  const { 
    availableStores, 
    isLoadingStores, 
    createTransfer, 
    isCreating, 
    getDefaultTransferDate,
    validateTransferRequest
  } = useTransfer()

  const { 
    control, 
    handleSubmit, 
    formState: { errors }, 
    reset, 
    watch, 
    setValue, 
    setError, 
    clearErrors 
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: { 
      to_store_id: '', 
      transfer_date: '', 
      notes: '' 
    }
  })

  const watchedValues = watch()

  // Filter out employee's current store from available stores
  const validStores = useMemo(() => {
    return availableStores.filter(store => store.id !== employee.store_id)
  }, [availableStores, employee.store_id])

  // Validate store selection
  useEffect(() => {
    if (watchedValues.to_store_id === employee.store_id) {
      setError('to_store_id', { 
        type: 'manual', 
        message: TRANSFER_MESSAGES.SAME_STORE 
      })
    } else {
      clearErrors('to_store_id')
    }
  }, [watchedValues.to_store_id, employee.store_id, setError, clearErrors])

  // Set default transfer date when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultDate = getDefaultTransferDate()
      setValue('transfer_date', defaultDate.toISOString().split('T')[0])
    }
  }, [isOpen, setValue, getDefaultTransferDate])

  // Calculate days until transfer
  const daysUntilTransfer = useMemo(() => {
    if (!watchedValues.transfer_date) return 0
    
    const transferDate = new Date(watchedValues.transfer_date)
    const today = new Date()
    const timeDiff = transferDate.getTime() - today.getTime()
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
  }, [watchedValues.transfer_date])

  const onSubmit = async (data: TransferFormData) => {
    // Additional validation before submission
    const validation = await validateTransferRequest({
      employee_id: employee.id,
      to_store_id: data.to_store_id,
      transfer_date: data.transfer_date,
      notes: data.notes
    })

    if (!validation.isValid) {
      setError('to_store_id', { 
        type: 'manual', 
        message: validation.error || 'Eroare la validarea transferului' 
      })
      return
    }

    try {
      await createTransfer({
        employee_id: employee.id,
        to_store_id: data.to_store_id,
        transfer_date: data.transfer_date,
        notes: data.notes
      })
      
      reset()
      
      if (onSuccess) {
        onSuccess()
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Failed to create transfer:', error)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Get minimum and maximum allowed dates for date input
  const getMinDate = () => {
    const minDate = TransferValidationRules.getMinTransferDate()
    return minDate.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = TransferValidationRules.getMaxTransferDate()
    return maxDate.toISOString().split('T')[0]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Transferă Angajat</h2>
          <button type="button" onClick={handleClose} className="text-gray-500 hover:text-gray-800 text-2xl">
            &times;
          </button>
        </div>
        
        {/* Employee Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900">{employee.full_name}</h3>
          <p className="text-sm text-gray-600">
            {employee.position || 'Staff'} • Actualmente la: {employee.store?.name}
          </p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Store Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transferă la Magazin *
            </label>
            <Controller
              name="to_store_id"
              control={control}
              render={({ field }) => (
                <select 
                  {...field}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.to_store_id ? 'border-red-500' : 'border-gray-300'
                  }`} 
                  disabled={isLoadingStores || isCreating}
                >
                  <option value="">Alegeți magazinul destinație...</option>
                  {validStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.to_store_id && (
              <p className="mt-1 text-sm text-red-600">{errors.to_store_id.message}</p>
            )}
            {validStores.length === 0 && !isLoadingStores && (
              <p className="mt-1 text-sm text-amber-600">
                Nu există alte magazine disponibile pentru transfer.
              </p>
            )}
            {availableStores.length > validStores.length && (
              <p className="mt-1 text-xs text-gray-500">
                Notă: {employee.store?.name} este exclus din listă.
              </p>
            )}
          </div>
          
          {/* Transfer Date */}
          <Controller
            name="transfer_date"
            control={control}
            render={({ field }) => (
              <div>
                <EuropeanDateInput
                  label="Data transferului *"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isCreating}
                  required
                  min={getMinDate()}
                  max={getMaxDate()}
                />
                {errors.transfer_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.transfer_date.message}</p>
                )}
              </div>
            )}
          />
          
          {/* Transfer Duration Info */}
          {daysUntilTransfer > 0 && (
            <div className={`text-sm p-2 rounded ${
              daysUntilTransfer > TRANSFER_CONSTANTS.MAX_TRANSFER_DAYS 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : daysUntilTransfer <= TRANSFER_CONSTANTS.MIN_TRANSFER_DAYS 
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              Transferul va avea loc în <span className="font-medium">{daysUntilTransfer} zile</span>
              {daysUntilTransfer > TRANSFER_CONSTANTS.MAX_TRANSFER_DAYS && (
                <span className="ml-2">(Prea departe în viitor!)</span>
              )}
              {daysUntilTransfer <= TRANSFER_CONSTANTS.MIN_TRANSFER_DAYS && (
                <span className="ml-2">(Foarte curând - asigurați-vă că este corect!)</span>
              )}
            </div>
          )}
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notițe (Opțional)
            </label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <textarea 
                  {...field}
                  rows={3} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                  placeholder="Motivul transferului, detalii suplimentare..." 
                  disabled={isCreating}
                />
              )}
            />
          </div>
          
          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-amber-700">
                <p className="font-medium">Important:</p>
                <p>Transferul va necesita aprobare de la managementul magazinului destinație înainte de a fi efectuat.</p>
              </div>
            </div>
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
              disabled={
                isCreating || 
                daysUntilTransfer > TRANSFER_CONSTANTS.MAX_TRANSFER_DAYS || 
                watchedValues.to_store_id === employee.store_id || 
                validStores.length === 0
              }
            >
              {isCreating ? 'Se creează...' : 'Creează Transfer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}