// lib/services/absenceTypesService.ts
import { supabase } from '@/lib/supabase/client'

export interface AbsenceType {
  id: string
  code: string
  name: string
  description?: string
  is_active: boolean
  requires_hours: boolean
  color_class?: string
  sort_order: number
  created_at: string
  updated_at: string
}

/**
 * Service for managing absence types
 */
export class AbsenceTypesService {
  /**
   * Get all active absence types ordered by sort_order
   */
  static async getActiveAbsenceTypes(): Promise<AbsenceType[]> {
    try {
      const { data, error } = await supabase
        .from('absence_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('AbsenceTypesService: Failed to fetch absence types:', error)
        throw new Error(`Failed to fetch absence types: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('AbsenceTypesService: Error fetching absence types:', error)
      throw error
    }
  }

  /**
   * Get absence type by code
   */
  static async getAbsenceTypeByCode(code: string): Promise<AbsenceType | null> {
    try {
      const { data, error } = await supabase
        .from('absence_types')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No data found
        }
        throw new Error(`Failed to fetch absence type: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('AbsenceTypesService: Error fetching absence type:', error)
      throw error
    }
  }

  /**
   * Create new absence type (HR only)
   */
  static async createAbsenceType(absenceType: Omit<AbsenceType, 'id' | 'created_at' | 'updated_at'>): Promise<AbsenceType> {
    try {
      const { data, error } = await supabase
        .from('absence_types')
        .insert(absenceType)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create absence type: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('AbsenceTypesService: Error creating absence type:', error)
      throw error
    }
  }

  /**
   * Update absence type (HR only)
   */
  static async updateAbsenceType(id: string, updates: Partial<AbsenceType>): Promise<AbsenceType> {
    try {
      const { data, error } = await supabase
        .from('absence_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update absence type: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('AbsenceTypesService: Error updating absence type:', error)
      throw error
    }
  }

  /**
   * Deactivate absence type (HR only)
   */
  static async deactivateAbsenceType(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('absence_types')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to deactivate absence type: ${error.message}`)
      }
    } catch (error) {
      console.error('AbsenceTypesService: Error deactivating absence type:', error)
      throw error
    }
  }

  /**
   * Check if absence type allows partial hours
   */
  static isPartialHoursAllowed(absenceTypes: AbsenceType[], statusCode: string): boolean {
    const absenceType = absenceTypes.find(type => type.code === statusCode)
    return absenceType?.requires_hours || false
  }

  /**
   * Get absence type color class for UI
   */
  static getAbsenceTypeColorClass(absenceTypes: AbsenceType[], statusCode: string): string {
    const absenceType = absenceTypes.find(type => type.code === statusCode)
    return absenceType?.color_class || 'bg-gray-100 text-gray-700 border-gray-300'
  }

  /**
   * Get absence type display name
   */
  static getAbsenceTypeName(absenceTypes: AbsenceType[], statusCode: string): string {
    const absenceType = absenceTypes.find(type => type.code === statusCode)
    return absenceType?.name || statusCode
  }
}