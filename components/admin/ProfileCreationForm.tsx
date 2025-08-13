// components/admin/ProfileCreationForm.tsx - FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

const profileSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['HR', 'ASM', 'STORE_MANAGER'], {
    required_error: 'Please select a role'
  }),
  zone_id: z.string().optional(),
  store_id: z.string().optional()
}).superRefine((data, ctx) => {
  // Role-specific validations
  if (data.role === 'ASM' && !data.zone_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Zone is required for ASM role',
      path: ['zone_id']
    })
  }
  
  if (data.role === 'STORE_MANAGER' && !data.store_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Store is required for Store Manager role',
      path: ['store_id']
    })
  }
})

type ProfileFormData = z.infer<typeof profileSchema>

interface Zone {
  id: string
  name: string
}

interface Store {
  id: string
  name: string
  zone_id: string
}

interface ProfileCreationFormProps {
  onProfileCreated: (profile: any) => void
  onCancel: () => void
}

export function ProfileCreationForm({ onProfileCreated, onCancel }: ProfileCreationFormProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [filteredStores, setFilteredStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  })

  const watchRole = watch('role')
  const watchZoneId = watch('zone_id')

  // Fetch zones and stores
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zonesResult, storesResult] = await Promise.all([
          supabase.from('zones').select('id, name').order('name'),
          supabase.from('stores').select('id, name, zone_id').order('name')
        ])

        if (zonesResult.error) throw zonesResult.error
        if (storesResult.error) throw storesResult.error

        setZones(zonesResult.data || [])
        setStores(storesResult.data || [])
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast.error('Failed to load zones and stores')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter stores based on selected zone
  useEffect(() => {
    if (watchZoneId) {
      const filtered = stores.filter(store => store.zone_id === watchZoneId)
      setFilteredStores(filtered)
    } else {
      setFilteredStores(stores)
    }
  }, [watchZoneId, stores])

  // Clear dependent fields when role changes
  useEffect(() => {
    if (watchRole) {
      setValue('zone_id', '')
      setValue('store_id', '')
    }
  }, [watchRole, setValue])

  // ✅ FIXED: Use API endpoint instead of direct Supabase operations
  const onSubmit = async (data: ProfileFormData) => {
    try {
      console.log('🔧 ProfileCreationForm: Submitting profile data via API')
      
      // Prepare the profile data
      const profileData = {
        email: data.email.trim().toLowerCase(),
        full_name: data.full_name.trim(),
        role: data.role,
        zone_id: data.zone_id || undefined,
        store_id: data.store_id || undefined
      }

      console.log('📝 Profile data to submit:', profileData)

      // ✅ Use the API route instead of direct Supabase
      const response = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData)
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle validation errors from API
        if (result.details && typeof result.details === 'object') {
          // Show field-specific errors
          const errorMessages = Object.entries(result.details)
            .map(([field, message]) => `${field}: ${message}`)
            .join(', ')
          
          toast.error('Validation failed', {
            description: errorMessages
          })
        } else {
          toast.error('Failed to create profile', {
            description: result.error || 'Unknown error occurred'
          })
        }
        return
      }

      console.log('✅ Profile created successfully via API:', result.profile?.id)

      toast.success('Profile created successfully', {
        description: `Profile for ${data.full_name} has been created`
      })

      // Pass the created profile back to parent component
      onProfileCreated(result.profile)

    } catch (error) {
      console.error('❌ Profile creation error:', error)
      toast.error('Failed to create profile', {
        description: error instanceof Error ? error.message : 'Network error occurred'
      })
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-300 p-6 mb-4">
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
    <div className="bg-white rounded-lg border border-gray-300 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Create New Profile</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email Address *"
            type="email"
            placeholder="employee@company.com"
            {...register('email')}
            error={errors.email?.message}
          />
          
          <Input
            label="Full Name *"
            placeholder="John Doe"
            {...register('full_name')}
            error={errors.full_name?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Role *
            </label>
            <select
              {...register('role')}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${
                errors.role ? 'border-red-500' : ''
              }`}
            >
              <option value="">Select role...</option>
              <option value="HR">Human Resources</option>
              <option value="ASM">Area Sales Manager</option>
              <option value="STORE_MANAGER">Store Manager</option>
            </select>
            {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>}
          </div>

          {(watchRole === 'ASM' || watchRole === 'STORE_MANAGER') && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Zone {watchRole === 'ASM' ? '*' : ''}
              </label>
              <select
                {...register('zone_id')}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${
                  errors.zone_id ? 'border-red-500' : ''
                }`}
              >
                <option value="">Select zone...</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
              {errors.zone_id && <p className="text-sm text-red-600 mt-1">{errors.zone_id.message}</p>}
            </div>
          )}

          {watchRole === 'STORE_MANAGER' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Store *
              </label>
              <select
                {...register('store_id')}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 ${
                  errors.store_id ? 'border-red-500' : ''
                }`}
                disabled={!watchZoneId}
              >
                <option value="">Select store...</option>
                {filteredStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
              {errors.store_id && <p className="text-sm text-red-600 mt-1">{errors.store_id.message}</p>}
              {watchRole === 'STORE_MANAGER' && !watchZoneId && (
                <p className="text-xs text-gray-500 mt-1">Select a zone first</p>
              )}
            </div>
          )}
        </div>

        {/* Role Information */}
        {watchRole && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Role Information</h4>
            <div className="text-sm text-blue-700">
              {watchRole === 'HR' && (
                <p>HR users have full system access including user management and all zones/stores.</p>
              )}
              {watchRole === 'ASM' && (
                <p>Area Sales Managers can manage all stores within their assigned zone.</p>
              )}
              {watchRole === 'STORE_MANAGER' && (
                <p>Store Managers can only manage their assigned store and its employees.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create Profile
          </Button>
        </div>
      </form>
    </div>
  )
}