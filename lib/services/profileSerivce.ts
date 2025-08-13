// lib/services/profileService.ts - FIXED VERSION
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export interface EnhancedProfile extends Profile {
  zone?: { id: string; name: string }
  store?: { id: string; name: string }
  auth_status?: {
    exists: boolean
    email_confirmed: boolean
    last_sign_in_at?: string
    has_password: boolean
    has_completed_setup: boolean
    is_pending_setup: boolean
    account_created_at?: string
  }
}

export interface CreateProfileRequest {
  email: string
  full_name: string
  role: 'HR' | 'ASM' | 'STORE_MANAGER'
  zone_id?: string
  store_id?: string
}

export interface BulkImportRow {
  email: string
  full_name: string
  role: string
  zone_name?: string
  store_name?: string
}

export interface BulkImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    email: string
    error: string
  }>
}

export class ProfileService {
  /**
   * Get all profiles with enhanced data
   */
  static async getProfiles(): Promise<EnhancedProfile[]> {
    console.log('🔍 ProfileService: Fetching profiles from API...')
    
    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache control to prevent browser caching issues
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      console.log('✅ ProfileService: Profiles fetched successfully:', data.profiles?.length || 0)
      return data.profiles || []
      
    } catch (error) {
      console.error('❌ ProfileService: Error fetching profiles:', error)
      throw error
    }
  }

  /**
   * Create a single profile
   */
  static async createProfile(profileData: CreateProfileRequest): Promise<EnhancedProfile> {
    console.log('🔧 ProfileService: Creating profile for:', profileData.email)
    
    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData),
        cache: 'no-store'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create profile')
      }

      console.log('✅ ProfileService: Profile created successfully:', data.profile?.id)
      return data.profile
      
    } catch (error) {
      console.error('❌ ProfileService: Error creating profile:', error)
      throw error
    }
  }

  /**
   * Get available zones for dropdown
   */
  static async getZones() {
    const { data, error } = await supabase
      .from('zones')
      .select('id, name')
      .order('name')

    if (error) {
      throw new Error('Failed to fetch zones')
    }

    return data
  }

  /**
   * Get available stores for dropdown
   */
  static async getStores() {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, zone_id')
      .order('name')

    if (error) {
      throw new Error('Failed to fetch stores')
    }

    return data
  }

  /**
   * Validate profile data before creation
   */
  static validateProfile(data: CreateProfileRequest): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    // Email validation
    if (!data.email || !data.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format'
    }

    // Name validation
    if (!data.full_name || !data.full_name.trim()) {
      errors.full_name = 'Full name is required'
    } else if (data.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters'
    }

    // Role validation
    if (!data.role) {
      errors.role = 'Role is required'
    } else if (!['HR', 'ASM', 'STORE_MANAGER'].includes(data.role)) {
      errors.role = 'Invalid role'
    }

    // Role-specific validations
    if (data.role === 'ASM' && !data.zone_id) {
      errors.zone_id = 'Zone is required for ASM role'
    }

    if (data.role === 'STORE_MANAGER' && !data.store_id) {
      errors.store_id = 'Store is required for Store Manager role'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Process bulk import data
   */
  static async processBulkImport(
    importData: BulkImportRow[],
    zones: Array<{ id: string; name: string }>,
    stores: Array<{ id: string; name: string; zone_id: string }>
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    for (let i = 0; i < importData.length; i++) {
      const row = importData[i]
      const rowNumber = i + 2 // Excel row number (accounting for header)

      try {
        // Validate required fields
        if (!row.email || !row.full_name || !row.role) {
          result.errors.push({
            row: rowNumber,
            email: row.email || 'N/A',
            error: 'Missing required fields (email, full_name, role)'
          })
          result.failed++
          continue
        }

        // Validate role
        if (!['HR', 'ASM', 'STORE_MANAGER'].includes(row.role)) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'Invalid role. Must be HR, ASM, or STORE_MANAGER'
          })
          result.failed++
          continue
        }

        // Map zone and store names to IDs
        let zone_id = null
        let store_id = null

        if (row.zone_name) {
          const zone = zones.find(z => z.name.toLowerCase() === row.zone_name.toLowerCase())
          if (!zone) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: `Zone "${row.zone_name}" not found`
            })
            result.failed++
            continue
          }
          zone_id = zone.id
        }

        if (row.store_name) {
          const store = stores.find(s => s.name.toLowerCase() === row.store_name!.toLowerCase())
          if (!store) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: `Store "${row.store_name}" not found`
            })
            result.failed++
            continue
          }
          store_id = store.id
          zone_id = store.zone_id // Ensure zone_id matches store's zone
        }

        // Role-specific validations
        if (row.role === 'ASM' && !zone_id) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'ASM role requires a zone'
          })
          result.failed++
          continue
        }

        if (row.role === 'STORE_MANAGER' && !store_id) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'STORE_MANAGER role requires a store'
          })
          result.failed++
          continue
        }

        // Create profile via API
        const profileData: CreateProfileRequest = {
          email: row.email.trim().toLowerCase(),
          full_name: row.full_name.trim(),
          role: row.role as 'HR' | 'ASM' | 'STORE_MANAGER',
          zone_id: zone_id || undefined,
          store_id: store_id || undefined
        }

        await this.createProfile(profileData)
        result.success++

      } catch (error) {
        result.errors.push({
          row: rowNumber,
          email: row.email || 'N/A',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        result.failed++
      }
    }

    return result
  }

  /**
   * Generate Excel template for bulk import
   */
  static generateImportTemplate() {
    return [
      {
        email: 'example1@company.com',
        full_name: 'John Doe',
        role: 'STORE_MANAGER',
        zone_name: 'North Zone',
        store_name: 'Store 001'
      },
      {
        email: 'example2@company.com',
        full_name: 'Jane Smith',
        role: 'ASM',
        zone_name: 'South Zone',
        store_name: ''
      },
      {
        email: 'example3@company.com',
        full_name: 'Bob Johnson',
        role: 'HR',
        zone_name: '',
        store_name: ''
      }
    ]
  }
}