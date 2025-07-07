'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTimesheets, type TimesheetWithDetails } from '@/hooks/data/useTimesheets'
import { useAuth } from '@/hooks/auth/useAuth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from 'sonner'

const timesheetSchema = z.object({
  employee_name: z.string()
    .min(1, 'Employee name is required')
    .min(2, 'Employee name must be at least 2 characters')
    .max(100, 'Employee name cannot exceed 100 characters'),
  store_id: z.string().min(1, 'Store is required'),
  zone_id: z.string().min(1, 'Zone is required'),
  period_start: z.string().min(1, 'Start date is required'),
  period_end: z.string().min(1, 'End date is required'),
  total_hours: z.number()
    .min(0, 'Hours cannot be negative')
    .max(200, 'Hours cannot exceed 200 per period'),
  notes: z.string().optional()
}).refine((data) => {
  const start = new Date(data.period_start)
  const end = new Date(data.period_end)
  return end >= start
}, {
  message: 'End date must be after or equal to start date',
  path: ['period_end']
})

type TimesheetFormData = z.infer<typeof timesheetSchema>

interface Store {
  id: string
  name: string
  zone_id: string
}

interface Zone {
  id: string
  name: string
}

interface TimesheetFormProps {
  timesheet?: TimesheetWithDetails | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function TimesheetForm({ timesheet, onSuccess, onCancel }: TimesheetFormProps) {
  const { createTimesheet, updateTimesheet, isCreating, isUpdating } = useTimesheets()
  const { profile } = useAuth()
  
  const [stores, setStores] = useState<Store[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [loadingZones, setLoadingZones] = useState(true)

  const isEditing = !!timesheet
  const isSubmitting = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<TimesheetFormData>({
    resolver: zodResolver(timesheetSchema),
    defaultValues: {
      employee_name: timesheet?.employee_name || '',
      store_id: timesheet?.store_id || profile?.store_id || '',
      zone_id: timesheet?.zone_id || profile?.zone_id || '',
      period_start: timesheet?.period_start?.split('T')[0] || '',
      period_end: timesheet?.period_end?.split('T')[0] || '',
      total_hours: timesheet?.total_hours || 0,
      notes: timesheet?.notes || ''
    }
  })

  const watchStoreId = watch('store_id')

  // Fetch stores and zones
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return

      try {
        console.log('Fetching stores and zones for role:', profile.role)
        
        // Fetch both in parallel
        const [storesResponse, zonesResponse] = await Promise.all([
          supabase
            .from('stores')
            .select('id, name, zone_id')
            .order('name'),
          supabase
            .from('zones')
            .select('id, name')
            .order('name')
        ])

        // Handle stores
        if (storesResponse.error) {
          console.error('Error fetching stores:', storesResponse.error)
          toast.error('Failed to load stores')
        } else {
          console.log('Loaded stores:', storesResponse.data)
          setStores(storesResponse.data || [])
        }

        // Handle zones
        if (zonesResponse.error) {
          console.error('Error fetching zones:', zonesResponse.error)
          toast.error('Failed to load zones')
        } else {
          console.log('Loaded zones:', zonesResponse.data)
          setZones(zonesResponse.data || [])
        }

      } catch (error) {
        console.error('Fetch error:', error)
      } finally {
        setLoadingStores(false)
        setLoadingZones(false)
      }
    }

    fetchData()
  }, [profile])

  // Auto-select zone when store changes
  useEffect(() => {
    if (watchStoreId && stores.length > 0) {
      const selectedStore = stores.find(store => store.id === watchStoreId)
      if (selectedStore && selectedStore.zone_id) {
        setValue('zone_id', selectedStore.zone_id)
        console.log(`Auto-selected zone ${selectedStore.zone_id} for store ${watchStoreId}`)
      }
    }
  }, [watchStoreId, stores, setValue])

  // Auto-calculate period end
  const handleStartDateChange = (startDate: string) => {
    if (startDate && !isEditing) {
      const start = new Date(startDate)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      setValue('period_end', end.toISOString().split('T')[0])
    }
  }

  const onSubmit = async (data: TimesheetFormData) => {
    try {
      console.log('Submitting timesheet:', data)

      if (isEditing && timesheet) {
        updateTimesheet({
          id: timesheet.id,
          updates: {
            period_start: data.period_start,
            period_end: data.period_end,
            total_hours: data.total_hours,
            notes: data.notes || null
          }
        })
      } else {
        createTimesheet({
          employee_name: data.employee_name,
          store_id: data.store_id,
          zone_id: data.zone_id,
          period_start: data.period_start,
          period_end: data.period_end,
          total_hours: data.total_hours,
          notes: data.notes || null
        })
      }

      onSuccess?.()
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error('Failed to save timesheet')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Employee Name */}
      <Input
        label="Employee *"
        placeholder="Enter employee full name..."
        {...register('employee_name')}
        error={errors.employee_name?.message}
        disabled={isEditing}
      />

      {/* Store and Zone Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Store Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Store *
          </label>
          {loadingStores ? (
            <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
          ) : (
            <select
              {...register('store_id')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                errors.store_id ? 'border-red-500 ring-1 ring-red-500' : ''
              }`}
              style={{
                color: '#111827', // Force dark text
                backgroundColor: '#ffffff' // Force white background
              }}
            >
              <option value="" style={{ color: '#6b7280', backgroundColor: '#ffffff' }}>
                Select a store...
              </option>
              {stores.map((store) => (
                <option 
                  key={store.id} 
                  value={store.id}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                >
                  {store.name}
                </option>
              ))}
            </select>
          )}
          {errors.store_id && (
            <p className="mt-1 text-sm text-red-600">{errors.store_id.message}</p>
          )}
        </div>

        {/* Zone Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Zone *
          </label>
          {loadingZones ? (
            <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
          ) : (
            <select
              {...register('zone_id')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                errors.zone_id ? 'border-red-500 ring-1 ring-red-500' : ''
              }`}
              style={{
                color: '#111827', // Force dark text
                backgroundColor: '#ffffff' // Force white background
              }}
            >
              <option value="" style={{ color: '#6b7280', backgroundColor: '#ffffff' }}>
                Select a zone...
              </option>
              {zones.map((zone) => (
                <option 
                  key={zone.id} 
                  value={zone.id}
                  style={{ color: '#111827', backgroundColor: '#ffffff' }}
                >
                  {zone.name}
                </option>
              ))}
            </select>
          )}
          {errors.zone_id && (
            <p className="mt-1 text-sm text-red-600">{errors.zone_id.message}</p>
          )}
        </div>
      </div>

      {/* Success Message */}
      {stores.length > 0 && zones.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-700">
            ✅ Successfully loaded {stores.length} stores and {zones.length} zones
          </p>
        </div>
      )}

      {/* Period Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Period Start Date *"
          type="date"
          {...register('period_start')}
          onChange={(e) => {
            register('period_start').onChange(e)
            handleStartDateChange(e.target.value)
          }}
          error={errors.period_start?.message}
        />
        
        <Input
          label="Period End Date *"
          type="date"
          {...register('period_end')}
          error={errors.period_end?.message}
        />
      </div>

      {/* Total Hours */}
      <Input
        label="Total Hours *"
        type="number"
        step="0.5"
        min="0"
        max="200"
        {...register('total_hours', { valueAsNumber: true })}
        error={errors.total_hours?.message}
        helperText="Enter total hours worked during this period (maximum 200 hours)"
      />

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">
          Notes (Optional)
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          placeholder="Add any additional notes about this timesheet..."
          style={{
            color: '#111827',
            backgroundColor: '#ffffff'
          }}
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEditing ? 'Update Timesheet' : 'Create Timesheet'}
        </Button>
      </div>

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <h4 className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</h4>
          <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field}>
                {field.replace('_', ' ')}: {error?.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  )
}