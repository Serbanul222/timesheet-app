// lib/services/transferService.ts - FIXED: Allow today's date in service validation
import { supabase } from '@/lib/supabase/client'
import {
  Transfer,
  TransferWithDetails,
  CreateTransferRequest,
  TransferFilters,
  TransferValidationResult,
  TRANSFER_MESSAGES,
  TRANSFER_CONSTANTS
} from '@/types/transfer'
import { Database } from '@/types/database'

type Employee = Database['public']['Tables']['employees']['Row']
type Store = Database['public']['Tables']['stores']['Row']

interface TransferServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Service class for managing employee transfers
 */
export class TransferService {
  /**
   * Get transfers with optional filtering and detailed information
   */
  static async getTransfers(filters: TransferFilters = {}): Promise<TransferWithDetails[]> {
    try {
      let query = supabase
        .from('employee_transfers')
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_transfers_from_store_id_fkey(id, name),
          to_store:stores!employee_transfers_to_store_id_fkey(id, name),
          from_zone:zones!employee_transfers_from_zone_id_fkey(id, name),
          to_zone:zones!employee_transfers_to_zone_id_fkey(id, name),
          initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name, role),
          approved_by_user:profiles!employee_transfers_approved_by_fkey(id, full_name, role)
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters.employee_id) query = query.eq('employee_id', filters.employee_id)
      if (filters.from_store_id) query = query.eq('from_store_id', filters.from_store_id)
      if (filters.to_store_id) query = query.eq('to_store_id', filters.to_store_id)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.initiated_by) query = query.eq('initiated_by', filters.initiated_by)
      if (filters.approved_by) query = query.eq('approved_by', filters.approved_by)
      if (filters.transfer_date_from) query = query.gte('transfer_date', filters.transfer_date_from)
      if (filters.transfer_date_to) query = query.lte('transfer_date', filters.transfer_date_to)

      const { data, error } = await query

      if (error) {
        console.error('TransferService: Error fetching transfers:', error)
        throw new Error(`Failed to fetch transfers: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('TransferService: Get transfers failed:', error)
      throw error
    }
  }

  /**
   * Create a new transfer request
   */
  static async createTransfer(
    request: CreateTransferRequest,
    initiatedBy: string
  ): Promise<TransferServiceResult<TransferWithDetails>> {
    try {
      // Get employee details for validation and zone info
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*, store:stores(id, name, zone_id), zone:zones(id, name)')
        .eq('id', request.employee_id)
        .single()

      if (employeeError || !employee) {
        return {
          success: false,
          error: TRANSFER_MESSAGES.INVALID_EMPLOYEE
        }
      }

      // Get destination store details
      const { data: toStore, error: storeError } = await supabase
        .from('stores')
        .select('*, zone:zones(id, name)')
        .eq('id', request.to_store_id)
        .single()

      if (storeError || !toStore) {
        return {
          success: false,
          error: TRANSFER_MESSAGES.STORE_NOT_FOUND
        }
      }

      // Validate the transfer request
      const validation = await this.validateTransferRequest(request, employee, toStore, initiatedBy)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      // Create the transfer record
      const transferData = {
        employee_id: request.employee_id,
        from_store_id: employee.store_id,
        to_store_id: request.to_store_id,
        from_zone_id: employee.zone_id,
        to_zone_id: toStore.zone_id,
        initiated_by: initiatedBy,
        transfer_date: request.transfer_date,
        notes: request.notes || null,
        status: 'pending' as const
      }

      const { data: transfer, error: createError } = await supabase
        .from('employee_transfers')
        .insert(transferData)
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_transfers_from_store_id_fkey(id, name),
          to_store:stores!employee_transfers_to_store_id_fkey(id, name),
          from_zone:zones!employee_transfers_from_zone_id_fkey(id, name),
          to_zone:zones!employee_transfers_to_zone_id_fkey(id, name),
          initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name, role)
        `)
        .single()

      if (createError) {
        console.error('TransferService: Error creating transfer:', createError)
        return {
          success: false,
          error: `Failed to create transfer: ${createError.message}`
        }
      }

      return {
        success: true,
        data: transfer
      }
    } catch (error) {
      console.error('TransferService: Create transfer failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Approve a pending transfer
   */
  static async approveTransfer(
    transferId: string,
    approvedBy: string
  ): Promise<TransferServiceResult<TransferWithDetails>> {
    try {
      // Update transfer status to approved
      const { data: transfer, error } = await supabase
        .from('employee_transfers')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId)
        .eq('status', 'pending') // Only approve pending transfers
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_transfers_from_store_id_fkey(id, name),
          to_store:stores!employee_transfers_to_store_id_fkey(id, name),
          initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name, role),
          approved_by_user:profiles!employee_transfers_approved_by_fkey(id, full_name, role)
        `)
        .single()

      if (error) {
        return {
          success: false,
          error: error.message.includes('No rows')
            ? TRANSFER_MESSAGES.TRANSFER_NOT_FOUND
            : `Failed to approve transfer: ${error.message}`
        }
      }

      return {
        success: true,
        data: transfer
      }
    } catch (error) {
      console.error('TransferService: Approve transfer failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Reject a pending transfer
   */
  static async rejectTransfer(
    transferId: string,
    rejectedBy: string
  ): Promise<TransferServiceResult<TransferWithDetails>> {
    try {
      const { data: transfer, error } = await supabase
        .from('employee_transfers')
        .update({
          status: 'rejected',
          approved_by: rejectedBy, // Store who rejected it
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId)
        .eq('status', 'pending')
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_transfers_from_store_id_fkey(id, name),
          to_store:stores!employee_transfers_to_store_id_fkey(id, name),
          initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name, role),
          approved_by_user:profiles!employee_transfers_approved_by_fkey(id, full_name, role)
        `)
        .single()

      if (error) {
        return {
          success: false,
          error: error.message.includes('No rows')
            ? TRANSFER_MESSAGES.TRANSFER_NOT_FOUND
            : `Failed to reject transfer: ${error.message}`
        }
      }

      return {
        success: true,
        data: transfer
      }
    } catch (error) {
      console.error('TransferService: Reject transfer failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Cancel a pending transfer (by initiator)
   */
  static async cancelTransfer(
    transferId: string,
    userId: string
  ): Promise<TransferServiceResult<TransferWithDetails>> {
    try {
      const { data: transfer, error } = await supabase
        .from('employee_transfers')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId)
        .eq('status', 'pending')
        .eq('initiated_by', userId) // Only initiator can cancel
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_transfers_from_store_id_fkey(id, name),
          to_store:stores!employee_transfers_to_store_id_fkey(id, name),
          initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name, role)
        `)
        .single()

      if (error) {
        return {
          success: false,
          error: error.message.includes('No rows')
            ? 'Transfer not found or cannot be cancelled'
            : `Failed to cancel transfer: ${error.message}`
        }
      }

      return {
        success: true,
        data: transfer
      }
    } catch (error) {
      console.error('TransferService: Cancel transfer failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Complete an approved transfer (updates employee store)
   * THIS IS THE ONLY MODIFIED METHOD IN THIS FILE
   */
  static async completeTransfer(transferId: string): Promise<TransferServiceResult> {
    try {
      // Use the database function for atomic completion
      const { data, error } = await supabase
        .rpc('complete_employee_transfer', { transfer_id: transferId })

      if (error) {
        console.error('TransferService: RPC complete_employee_transfer failed:', error)
        // Provide a more user-friendly error message based on the database exception
        const userMessage = error.message.includes('Employee current store does not match transfer source store')
          ? 'Angajatul nu mai aparține magazinului sursă. Transferul nu poate fi finalizat.'
          : `Finalizarea transferului a eșuat: ${error.message}`
        return {
          success: false,
          error: userMessage
        }
      }

      // The RPC returns true on success, or raises an exception on failure.
      if (data !== true) {
        return {
          success: false,
          error: 'Funcția din baza de date a raportat o eroare necunoscută la finalizarea transferului.'
        }
      }

      return {
        success: true,
        data: data
      }
    } catch (error) {
      console.error('TransferService: Unhandled exception in completeTransfer:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get stores available for transfer based on user permissions
   */
  static async getAvailableStores(userId: string): Promise<Store[]> {
    try {
      // Get user profile to determine permissions
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, store_id, zone_id')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        console.error('TransferService: Error fetching user profile:', profileError)
        return []
      }

      let storeQuery = supabase
        .from('stores')
        .select('*')
        .order('name')

      // Apply role-based filtering
      if (profile.role === 'STORE_MANAGER' && profile.store_id) {
        // Store managers can only see stores in their zone
        const { data: userStore } = await supabase
          .from('stores')
          .select('zone_id')
          .eq('id', profile.store_id)
          .single()

        if (userStore) {
          storeQuery = storeQuery.eq('zone_id', userStore.zone_id)
        }
      } else if (profile.role === 'ASM' && profile.zone_id) {
        // ASMs can see all stores in their zone
        storeQuery = storeQuery.eq('zone_id', profile.zone_id)
      }
      // HR can see all stores (no additional filter)

      const { data, error } = await storeQuery

      if (error) {
        console.error('TransferService: Error fetching stores:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('TransferService: Get available stores failed:', error)
      return []
    }
  }

  /**
   * Validate a transfer request - FIXED: Allow today's date
   */
  private static async validateTransferRequest(
    request: CreateTransferRequest,
    employee: any,
    toStore: any,
    initiatedBy: string
  ): Promise<TransferValidationResult> {
    // Basic validations
    if (!employee.is_active) {
      return { isValid: false, error: TRANSFER_MESSAGES.EMPLOYEE_NOT_ACTIVE, canTransfer: false }
    }

    if (employee.store_id === request.to_store_id) {
      return { isValid: false, error: TRANSFER_MESSAGES.SAME_STORE, canTransfer: false }
    }

    // FIXED: Check if transfer date is valid - allow today's date
    const transferDate = new Date(request.transfer_date)
    const now = new Date()

    // Remove time component for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const transferDateOnly = new Date(transferDate.getFullYear(), transferDate.getMonth(), transferDate.getDate())

    // FIXED: Allow transfer starting from today (>= today instead of > today)
    if (transferDateOnly < today) {
      return { isValid: false, error: TRANSFER_MESSAGES.PAST_TRANSFER_DATE, canTransfer: false }
    }

    const maxDate = new Date(today.getTime() + (TRANSFER_CONSTANTS.MAX_TRANSFER_DAYS * 24 * 60 * 60 * 1000))
    if (transferDateOnly > maxDate) {
      return { isValid: false, error: TRANSFER_MESSAGES.TRANSFER_DATE_TOO_FAR, canTransfer: false }
    }

    // Check for existing pending transfers
    const { data: existingTransfers } = await supabase
      .from('employee_transfers')
      .select('id')
      .eq('employee_id', request.employee_id)
      .in('status', ['pending', 'approved'])

    if (existingTransfers && existingTransfers.length > 0) {
      return {
        isValid: false,
        error: TRANSFER_MESSAGES.EMPLOYEE_HAS_PENDING_TRANSFER,
        canTransfer: false
      }
    }

    // Check if employee is currently delegated
    const now_iso = new Date().toISOString()
    const { data: activeDelegations } = await supabase
      .from('employee_delegations')
      .select('id')
      .eq('employee_id', request.employee_id)
      .eq('status', 'active')
      .lte('valid_from', now_iso)
      .gte('valid_until', now_iso)

    if (activeDelegations && activeDelegations.length > 0) {
      return {
        isValid: false,
        error: TRANSFER_MESSAGES.EMPLOYEE_IS_DELEGATED,
        canTransfer: false
      }
    }

    return { isValid: true, canTransfer: true }
  }

  /**
   * Get transfer by ID with full details
   */
  static async getTransferById(transferId: string): Promise<TransferWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('employee_transfers')
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_transfers_from_store_id_fkey(id, name),
          to_store:stores!employee_transfers_to_store_id_fkey(id, name),
          from_zone:zones!employee_transfers_from_zone_id_fkey(id, name),
          to_zone:zones!employee_transfers_to_zone_id_fkey(id, name),
          initiated_by_user:profiles!employee_transfers_initiated_by_fkey(id, full_name, role),
          approved_by_user:profiles!employee_transfers_approved_by_fkey(id, full_name, role)
        `)
        .eq('id', transferId)
        .single()

      if (error) {
        console.error('TransferService: Error fetching transfer by ID:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('TransferService: Get transfer by ID failed:', error)
      return null
    }
  }
}