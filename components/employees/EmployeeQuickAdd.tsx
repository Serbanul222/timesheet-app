'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/auth/useAuth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

const employeeSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  position: z.string().min(1, 'Position is required'),
  employee_code: z.string().optional().transform(val => val === '' ? null : val),
  store_id: z.string().min(1, 'Store is required'),
  zone_id: z.string().min(1, 'Zone is required')
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeQuickAddProps {
  onEmployeeAdded: (employee: any) => void
  onCancel: () => void
  preselectedStoreId?: string
}

export function EmployeeQuickAdd({
  onEmployeeAdded,
  onCancel,
  preselectedStoreId
}: EmployeeQuickAddProps) {
  const { profile } = useAuth()
  const [stores, setStores] = useState<Array<{id: string; name: string; zone_id: string}>>([])
  const [zones, setZones] = useState<Array<{id: string; name: string}>>([])
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: '',
      position: '',
      employee_code: '',
      store_id: preselectedStoreId || '',
      zone_id: ''
    }
  })

  const watchStoreId = watch('store_id')

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return

      try {
        // Get zones
        let zoneQuery = supabase.from('zones').select('id, name').order('name')
        if (profile.role === 'ASM' && profile.zone_id) {
          zoneQuery = zoneQuery.eq('id', profile.zone_id)
        }

        // Get stores  
        let storeQuery = supabase.from('stores').select('id, name, zone_id').order('name')
        if (profile.role === 'STORE_MANAGER' && profile.store_id) {
          storeQuery = storeQuery.eq('id', profile.store_id)
        } else if (profile.role === 'ASM' && profile.zone_id) {
          storeQuery = storeQuery.eq('zone_id', profile.zone_id)
        }

        const [zonesResult, storesResult] = await Promise.all([zoneQuery, storeQuery])

        if (zonesResult.data) setZones(zonesResult.data)
        if (storesResult.data) {
          setStores(storesResult.data)
          
          // Auto-select store for Store Managers
          if (profile.role === 'STORE_MANAGER' && profile.store_id) {
            setValue('store_id', profile.store_id)
            setValue('zone_id', storesResult.data[0]?.zone_id || '')
          } else if (preselectedStoreId) {
            setValue('store_id', preselectedStoreId)
            const store = storesResult.data.find(s => s.id === preselectedStoreId)
            if (store) setValue('zone_id', store.zone_id)
          }
        }
      } catch (error) {
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile, setValue, preselectedStoreId])

  // Auto-update zone when store changes
  useEffect(() => {
    if (watchStoreId) {
      const store = stores.find(s => s.id === watchStoreId)
      if (store) setValue('zone_id', store.zone_id)
    }
  }, [watchStoreId, stores, setValue])

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      const { data: newEmployee, error } = await supabase
        .from('employees')
        .insert(data)
        .select('*, store:stores(id, name), zone:zones(id, name)')
        .single()

      if (error) throw error

      toast.success(`Employee ${data.full_name} created`)
      onEmployeeAdded(newEmployee)
    } catch (error) {
      toast.error('Failed to create employee')
    }
  }

  const positions = ['Consilier', 'Store Manager', 'Assistant Manager', 'Cashier', 'Sales Associate', 'Staff']

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Add Employee</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            placeholder="Employee name"
            {...register('full_name')}
            error={errors.full_name?.message}
          />
          
          <Input
            label="Employee Code"
            placeholder="Optional ID"
            {...register('employee_code')}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Position *</label>
            <select
              {...register('position')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                errors.position ? 'border-red-500' : ''
              }`}
            >
              <option value="">Select...</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            {errors.position && <p className="text-sm text-red-600 mt-1">{errors.position.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Store *</label>
            <select
              {...register('store_id')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                errors.store_id ? 'border-red-500' : ''
              }`}
              disabled={profile?.role === 'STORE_MANAGER'}
            >
              <option value="">Select...</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
            {errors.store_id && <p className="text-sm text-red-600 mt-1">{errors.store_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Zone *</label>
            <select
              {...register('zone_id')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              disabled
            >
              <option value="">Auto-selected</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Based on store</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Add Employee
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EmployeeQuickAdd