// components/employees/EmployeeQuickAddWithLookup.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/auth/useAuth'
import { useEmployeeLookup } from '@/hooks/data/useEmployeeLookup'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { validateLensaEmail } from '@/types/externalEmployee'

const employeeSchema = z.object({
  email: z.string().email('Te rog să adaugi o adresă de email validă'),
  full_name: z.string().min(2, 'Numele trebuie să aibă cel puțin 2 caractere'),
  position: z.string().min(1, 'Poziția este necesară'),
  employee_code: z.string().optional().transform(val => val === '' ? null : val),
  store_id: z.string().min(1, 'Magazinul este necesar'),
  zone_id: z.string().min(1, 'Zona este necesară')
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeQuickAddWithLookupProps {
  onEmployeeAdded: (employee: any) => void
  onCancel: () => void
  preselectedStoreId?: string
}

export function EmployeeQuickAddWithLookup({
  onEmployeeAdded,
  onCancel,
  preselectedStoreId
}: EmployeeQuickAddWithLookupProps) {
  const { profile } = useAuth()
  const [stores, setStores] = useState<Array<{id: string; name: string; zone_id: string}>>([])
  const [zones, setZones] = useState<Array<{id: string; name: string}>>([])
  const [loading, setLoading] = useState(true)
  const [isLookupMode, setIsLookupMode] = useState(false)
  const [foundEmployee, setFoundEmployee] = useState<any>(null)

  // Initialize employee lookup hook
  const {
    state: lookupState,
    isLoading: isLookingUp,
    lookupEmployee,
    isValidEmail,
    clearResults
  } = useEmployeeLookup({
    onFound: (employee) => {
      console.log('Employee found:', employee)
      setFoundEmployee(employee)
      
      // Auto-populate form fields
      setValue('email', employee.email)
      setValue('full_name', employee.fullName)
      setValue('position', employee.position)
      
      toast.success('Employee found in Lensa database!', {
        description: `${employee.fullName} - ${employee.position}`
      })
    },
    onNotFound: (email) => {
      setFoundEmployee(null)
      toast.info('Employee not found', {
        description: `${email} not found in Lensa database. You can still create manually.`
      })
    },
    onError: (error) => {
      setFoundEmployee(null)
      toast.error('Lookup failed', {
        description: error
      })
    }
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      email: '',
      full_name: '',
      position: '',
      employee_code: '',
      store_id: preselectedStoreId || '',
      zone_id: ''
    }
  })

  const watchEmail = watch('email')
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

  // Handle email lookup
  const handleEmailLookup = async () => {
    if (!watchEmail || !isValidEmail(watchEmail)) {
      toast.warning('Please enter a valid Lensa email address')
      return
    }

    setIsLookupMode(true)
    await lookupEmployee(watchEmail)
  }

  // Handle manual entry mode
  const handleManualEntry = () => {
    setIsLookupMode(false)
    setFoundEmployee(null)
    clearResults()
    
    // Clear auto-populated fields except email
    setValue('full_name', '')
    setValue('position', '')
  }

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      const { data: newEmployee, error } = await supabase
        .from('employees')
        .insert({
          ...data,
          // Add source information if found via lookup
          employee_code: data.employee_code || (foundEmployee ? `LENSA_${Date.now()}` : null)
        })
        .select('*, store:stores(id, name), zone:zones(id, name)')
        .single()

      if (error) throw error

      toast.success(`Employee ${data.full_name} created successfully`, {
        description: foundEmployee ? 'Created from Lensa database lookup' : 'Created manually'
      })
      
      onEmployeeAdded(newEmployee)
    } catch (error) {
      toast.error('Failed to create employee')
      console.error('Employee creation error:', error)
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
        <h3 className="text-lg font-medium text-gray-900">Adaugă angajat</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Input with Lookup */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Email Address *</label>
          <div className="flex space-x-2">
            <Input
              placeholder="angajat@lensa.com"
              {...register('email')}
              error={errors.email?.message}
              containerClassName="flex-1"
              rightIcon={
                isValidEmail(watchEmail) ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : watchEmail ? (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : null
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleEmailLookup}
              disabled={!isValidEmail(watchEmail) || isLookingUp}
              loading={isLookingUp}
            >
              {isLookingUp ? 'Looking up...' : 'Lookup'}
            </Button>
          </div>
          
          {/* Lookup Status */}
          {foundEmployee && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-800">
                  Găsit: <strong>{foundEmployee.fullName}</strong> - {foundEmployee.position}
                </span>
              </div>
              <button
                type="button"
                onClick={handleManualEntry}
                className="text-xs text-green-600 hover:text-green-800 mt-1"
              >
                Schimbă la introducerea manuală
              </button>
            </div>
          )}
          
          {lookupState.status === 'success' && !foundEmployee && watchEmail && isValidEmail(watchEmail) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-blue-800">
                Angajatul nu a fost găsit in baza de date Lensa. Poți crea manual.
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nume întreg *"
            placeholder="Numele angajatului"
            {...register('full_name')}
            error={errors.full_name?.message}
            className={foundEmployee ? 'bg-green-50 border-green-300' : ''}
          />
          
          <Input
            label="Cod angajat"
            placeholder="ID opțional"
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
              } ${foundEmployee ? 'bg-green-50 border-green-300' : ''}`}
            >
              <option value="">Select...</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            {errors.position && <p className="text-sm text-red-600 mt-1">{errors.position.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Magazin *</label>
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
          <Button 
            type="submit" 
            loading={isSubmitting}
            className={foundEmployee ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {foundEmployee ? 'Add from Lensa DB' : 'Adaugă angajat'}
          </Button>
        </div>
      </form>
    </div>
  )
}