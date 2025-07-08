'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmployeeSelector } from '@/components/employees/EmployeeSelector'
import { validateTimesheetPeriod, getDefaultPeriod } from '@/lib/timesheet-utils'
import { useEmployees } from '@/hooks/data/useEmployees'
import { useAuth } from '@/hooks/auth/useAuth'
import { supabase } from '@/lib/supabase/client'

const timesheetCreatorSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  storeId: z.string().min(1, 'Store is required'),
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected')
}).refine((data) => {
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const error = validateTimesheetPeriod(start, end)
  return !error
}, {
  message: 'Invalid timesheet period',
  path: ['endDate']
})

type TimesheetCreatorData = z.infer<typeof timesheetCreatorSchema>

interface Store {
  id: string
  name: string
  zone_id: string
}

interface TimesheetCreatorProps {
  onCreateTimesheet: (data: {
    startDate: Date
    endDate: Date
    storeId: string
    employees: Array<{ id: string; name: string; position?: string }>
  }) => void
  onCancel: () => void
  className?: string
}

export function TimesheetCreator({
  onCreateTimesheet,
  onCancel,
  className = ''
}: TimesheetCreatorProps) {
  const { profile } = useAuth()
  const { employees, isLoading: loadingEmployees } = useEmployees()
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(true)

  const defaultPeriod = getDefaultPeriod()
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<TimesheetCreatorData>({
    resolver: zodResolver(timesheetCreatorSchema),
    defaultValues: {
      startDate: defaultPeriod.startDate.toISOString().split('T')[0],
      endDate: defaultPeriod.endDate.toISOString().split('T')[0],
      storeId: '',
      employeeIds: []
    }
  })

  const watchStartDate = watch('startDate')
  const watchStoreId = watch('storeId')

  // Fetch stores on component mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        console.log('Fetching stores for user role:', profile?.role)
        
        let query = supabase
          .from('stores')
          .select('id, name, zone_id')
          .order('name')

        // Apply role-based filtering
        if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
          query = query.eq('id', profile.store_id)
        } else if (profile?.role === 'ASM' && profile.zone_id) {
          query = query.eq('zone_id', profile.zone_id)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching stores:', error)
        } else {
          console.log('Loaded stores:', data)
          setStores(data || [])
          
          // Auto-select store for Store Managers
          if (profile?.role === 'STORE_MANAGER' && profile.store_id && data?.length === 1) {
            setValue('storeId', profile.store_id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setLoadingStores(false)
      }
    }

    if (profile) {
      fetchStores()
    }
  }, [profile, setValue])

  // Auto-update end date when start date changes (default to month end)
  const handleStartDateChange = (startDate: string) => {
    if (startDate) {
      const start = new Date(startDate)
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      setValue('endDate', monthEnd.toISOString().split('T')[0])
    }
  }

  // Handle employee selection
  const handleEmployeeSelection = (employeeIds: string[]) => {
    setSelectedEmployeeIds(employeeIds)
    setValue('employeeIds', employeeIds)
  }

  const onSubmit = (data: TimesheetCreatorData) => {
    const selectedEmployees = employees.filter(emp => 
      data.employeeIds.includes(emp.id)
    ).map(emp => ({
      id: emp.id,
      name: emp.full_name,
      position: emp.position || 'Staff'
    }))

    onCreateTimesheet({
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      storeId: data.storeId,
      employees: selectedEmployees
    })
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Create New Timesheet</h2>
        <p className="text-sm text-gray-600 mt-1">
          Select period and employees to create a new timesheet grid
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Period Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            {...register('startDate')}
            onChange={(e) => {
              register('startDate').onChange(e)
              handleStartDateChange(e.target.value)
            }}
            error={errors.startDate?.message}
          />
          
          <Input
            label="End Date *"
            type="date"
            {...register('endDate')}
            error={errors.endDate?.message}
            helperText="Maximum 31 days period"
          />
        </div>

        {/* Store Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Store *
          </label>
          {loadingStores ? (
            <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
          ) : (
            <select
              {...register('storeId')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                errors.storeId ? 'border-red-500 ring-1 ring-red-500' : ''
              }`}
              disabled={profile?.role === 'STORE_MANAGER' && stores.length === 1}
            >
              <option value="">Select a store...</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}
          {errors.storeId && (
            <p className="mt-1 text-sm text-red-600">{errors.storeId.message}</p>
          )}
          {profile?.role === 'STORE_MANAGER' && stores.length === 1 && (
            <p className="mt-1 text-sm text-gray-500">
              Your assigned store is automatically selected
            </p>
          )}
        </div>

        {/* Employee Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-900">
            Select Employees *
          </label>
          
          {loadingEmployees ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Loading employees...</span>
            </div>
          ) : (
            <EmployeeSelector
              employees={employees}
              selectedIds={selectedEmployeeIds}
              onSelectionChange={handleEmployeeSelection}
              maxHeight="200px"
            />
          )}
          
          {errors.employeeIds && (
            <p className="text-sm text-red-600">{errors.employeeIds.message}</p>
          )}
          
          {selectedEmployeeIds.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Summary */}
        {watchStartDate && selectedEmployeeIds.length > 0 && watchStoreId && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Timesheet Summary</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>Period: {new Date(watchStartDate).toLocaleDateString()} - {watch('endDate') ? new Date(watch('endDate')).toLocaleDateString() : '...'}</p>
              <p>Employees: {selectedEmployeeIds.length}</p>
              <p>Store: {stores.find(s => s.id === watchStoreId)?.name || 'Selected store'}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
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
            disabled={isSubmitting || selectedEmployeeIds.length === 0 || !watchStoreId}
          >
            Create Timesheet Grid
          </Button>
        </div>
      </form>
    </div>
  )
}