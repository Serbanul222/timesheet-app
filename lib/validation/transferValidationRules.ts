// lib/validation/transferValidationRules.ts - FIXED: Allow today's date
import { supabase } from '@/lib/supabase/client'
import {
  Transfer,
  TransferWithDetails,
  CreateTransferRequest,
  TransferValidationResult,
  TRANSFER_MESSAGES,
  TRANSFER_CONSTANTS
} from '@/types/transfer'

/**
 * Validation rules for employee transfers
 * FIXED: Allow transfers starting today
 */
export class TransferValidationRules {
  
  /**
   * Validate if user can initiate transfers based on their role and scope
   */
  static async validateTransferPermissions(
    userId: string,
    employeeId: string,
    toStoreId: string
  ): Promise<TransferValidationResult> {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, store_id, zone_id')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        return {
          isValid: false,
          error: 'Nu s-a putut verifica profilul utilizatorului',
          canTransfer: false
        }
      }

      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('store_id, zone_id, is_active')
        .eq('id', employeeId)
        .single()

      if (employeeError || !employee) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.INVALID_EMPLOYEE,
          canTransfer: false
        }
      }

      // Get destination store details
      const { data: toStore, error: storeError } = await supabase
        .from('stores')
        .select('zone_id')
        .eq('id', toStoreId)
        .single()

      if (storeError || !toStore) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.STORE_NOT_FOUND,
          canTransfer: false
        }
      }

      // Role-based permission checks
      switch (profile.role) {
        case 'HR':
          // HR can transfer any employee to any store
          return { isValid: true, canTransfer: true }

        case 'ASM':
          // ASM can only transfer employees within their zone
          if (profile.zone_id === employee.zone_id) {
            return { isValid: true, canTransfer: true }
          }
          return {
            isValid: false,
            error: 'Nu aveți permisiunea să transferați angajați din afara zonei dvs.',
            canTransfer: false
          }

        case 'STORE_MANAGER':
          // Store manager can only transfer employees from their store
          if (profile.store_id === employee.store_id) {
            // Cannot transfer across zones
            if (employee.zone_id !== toStore.zone_id) {
              return {
                isValid: false,
                error: TRANSFER_MESSAGES.CROSS_ZONE_STORE_MANAGER,
                canTransfer: false
              }
            }
            return { isValid: true, canTransfer: true }
          }
          return {
            isValid: false,
            error: TRANSFER_MESSAGES.EMPLOYEE_NOT_IN_STORE,
            canTransfer: false
          }

        default:
          return {
            isValid: false,
            error: TRANSFER_MESSAGES.INSUFFICIENT_PERMISSIONS,
            canTransfer: false
          }
      }
    } catch (error) {
      console.error('TransferValidationRules: Permission validation failed:', error)
      return {
        isValid: false,
        error: 'Eroare la validarea permisiunilor',
        canTransfer: false
      }
    }
  }

  /**
   * Validate if user can approve a specific transfer
   */
  static async validateApprovalPermissions(
    userId: string,
    transfer: TransferWithDetails
  ): Promise<TransferValidationResult> {
    try {
      // Cannot approve own transfer
      if (transfer.initiated_by === userId) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.CANNOT_APPROVE_OWN_TRANSFER,
          canTransfer: false
        }
      }

      // Transfer must be pending
      if (transfer.status !== 'pending') {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.TRANSFER_ALREADY_PROCESSED,
          canTransfer: false
        }
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, store_id, zone_id')
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        return {
          isValid: false,
          error: 'Nu s-a putut verifica profilul utilizatorului',
          canTransfer: false
        }
      }

      // Role-based approval permissions
      switch (profile.role) {
        case 'HR':
          // HR can approve any transfer
          return { isValid: true, canTransfer: true }

        case 'ASM':
          // ASM can approve transfers within their zone
          if (profile.zone_id === transfer.from_zone_id || profile.zone_id === transfer.to_zone_id) {
            return { isValid: true, canTransfer: true }
          }
          return {
            isValid: false,
            error: 'Nu aveți permisiunea să aprobați transferuri din afara zonei dvs.',
            canTransfer: false
          }

        case 'STORE_MANAGER':
          // Store manager can approve transfers TO their store
          if (profile.store_id === transfer.to_store_id) {
            return { isValid: true, canTransfer: true }
          }
          return {
            isValid: false,
            error: 'Nu aveți permisiunea să aprobați acest transfer',
            canTransfer: false
          }

        default:
          return {
            isValid: false,
            error: TRANSFER_MESSAGES.INSUFFICIENT_PERMISSIONS,
            canTransfer: false
          }
      }
    } catch (error) {
      console.error('TransferValidationRules: Approval validation failed:', error)
      return {
        isValid: false,
        error: 'Eroare la validarea permisiunilor de aprobare',
        canTransfer: false
      }
    }
  }

  /**
   * Validate transfer request data and business rules
   * FIXED: Allow today's date for transfers
   */
  static async validateTransferRequest(
    request: CreateTransferRequest
  ): Promise<TransferValidationResult> {
    try {
      // Basic field validation
      if (!request.employee_id?.trim()) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.INVALID_EMPLOYEE,
          canTransfer: false
        }
      }

      if (!request.to_store_id?.trim()) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.INVALID_STORE,
          canTransfer: false
        }
      }

      if (!request.transfer_date) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.INVALID_TRANSFER_DATE,
          canTransfer: false
        }
      }

      // FIXED: Validate transfer date - allow today's date
      const transferDate = new Date(request.transfer_date)
      const now = new Date()
      
      // Remove time component for date comparison
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const transferDateOnly = new Date(transferDate.getFullYear(), transferDate.getMonth(), transferDate.getDate())

      // FIXED: Allow transfer starting from today (>= today instead of > today)
      if (transferDateOnly < today) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.PAST_TRANSFER_DATE,
          canTransfer: false
        }
      }

      // Check maximum date (90 days from today)
      const maxDate = new Date(today.getTime() + (TRANSFER_CONSTANTS.MAX_TRANSFER_DAYS * 24 * 60 * 60 * 1000))
      if (transferDateOnly > maxDate) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.TRANSFER_DATE_TOO_FAR,
          canTransfer: false
        }
      }

      // Get employee details
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('store_id, is_active, full_name')
        .eq('id', request.employee_id)
        .single()

      if (employeeError || !employee) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.INVALID_EMPLOYEE,
          canTransfer: false
        }
      }

      // Employee must be active
      if (!employee.is_active) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.EMPLOYEE_NOT_ACTIVE,
          canTransfer: false
        }
      }

      // Cannot transfer to same store
      if (employee.store_id === request.to_store_id) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.SAME_STORE,
          canTransfer: false
        }
      }

      // Check for existing pending or approved transfers
      const { data: existingTransfers, error: transferError } = await supabase
        .from('employee_transfers')
        .select('id, status, transfer_date')
        .eq('employee_id', request.employee_id)
        .in('status', ['pending', 'approved'])

      if (transferError) {
        console.error('Error checking existing transfers:', transferError)
        return {
          isValid: false,
          error: 'Eroare la verificarea transferurilor existente',
          canTransfer: false
        }
      }

      if (existingTransfers && existingTransfers.length > 0) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.EMPLOYEE_HAS_PENDING_TRANSFER,
          canTransfer: false
        }
      }

      // Check if employee is currently delegated
      const nowIso = new Date().toISOString()
      const { data: activeDelegations, error: delegationError } = await supabase
        .from('employee_delegations')
        .select('id, valid_until')
        .eq('employee_id', request.employee_id)
        .eq('status', 'active')
        .lte('valid_from', nowIso)
        .gte('valid_until', nowIso)

      if (delegationError) {
        console.error('Error checking delegations:', delegationError)
        return {
          isValid: false,
          error: 'Eroare la verificarea delegărilor',
          canTransfer: false
        }
      }

      if (activeDelegations && activeDelegations.length > 0) {
        return {
          isValid: false,
          error: TRANSFER_MESSAGES.EMPLOYEE_IS_DELEGATED,
          canTransfer: false
        }
      }

      return { isValid: true, canTransfer: true }
    } catch (error) {
      console.error('TransferValidationRules: Request validation failed:', error)
      return {
        isValid: false,
        error: 'Eroare la validarea cererii de transfer',
        canTransfer: false
      }
    }
  }

  /**
   * Check if a transfer is pending and awaiting approval
   */
  static isTransferPending(transfer: Transfer): boolean {
    return transfer.status === 'pending'
  }

  /**
   * Check if a transfer is approved and ready for execution
   */
  static isTransferApproved(transfer: Transfer): boolean {
    return transfer.status === 'approved'
  }

  /**
   * Check if a transfer is completed
   */
  static isTransferCompleted(transfer: Transfer): boolean {
    return transfer.status === 'completed'
  }

  /**
   * Check if a transfer is ready to be executed (approved and date reached)
   */
  static isTransferReadyForExecution(transfer: Transfer): boolean {
    if (transfer.status !== 'approved') return false
    
    const now = new Date()
    const transferDate = new Date(transfer.transfer_date)
    
    // Remove time component for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const transferDateOnly = new Date(transferDate.getFullYear(), transferDate.getMonth(), transferDate.getDate())
    
    // FIXED: Allow execution on the same day (>= instead of >)
    return transferDateOnly <= today
  }

  /**
   * Check if a transfer is overdue (approved but past transfer date)
   */
  static isTransferOverdue(transfer: Transfer): boolean {
    if (transfer.status !== 'approved') return false
    
    const now = new Date()
    const transferDate = new Date(transfer.transfer_date)
    
    // Remove time component for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const transferDateOnly = new Date(transferDate.getFullYear(), transferDate.getMonth(), transferDate.getDate())
    
    // Overdue if transfer date was more than 1 day ago
    const oneDayAgo = new Date(today.getTime() - (24 * 60 * 60 * 1000))
    
    return transferDateOnly < oneDayAgo
  }

  /**
   * Get default transfer date (1 day from now instead of 7 days)
   * FIXED: More reasonable default
   */
  static getDefaultTransferDate(): Date {
    const date = new Date()
    // FIXED: Default to tomorrow instead of 7 days
    date.setDate(date.getDate() + 1)
    return date
  }

  /**
   * Get minimum allowed transfer date (today)
   * FIXED: Allow transfers starting today
   */
  static getMinTransferDate(): Date {
    // FIXED: Return today's date, not tomorrow
    return new Date()
  }

  /**
   * Get maximum allowed transfer date
   */
  static getMaxTransferDate(): Date {
    const date = new Date()
    date.setDate(date.getDate() + TRANSFER_CONSTANTS.MAX_TRANSFER_DAYS)
    return date
  }

  /**
   * Validate transfer date is within allowed range
   * FIXED: Allow today's date
   */
  static validateTransferDate(transferDate: Date): TransferValidationResult {
    const minDate = this.getMinTransferDate()
    const maxDate = this.getMaxTransferDate()
    
    // Remove time component for comparison
    const dateOnly = new Date(transferDate.getFullYear(), transferDate.getMonth(), transferDate.getDate())
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    
    // FIXED: Allow today's date (>= instead of >)
    if (dateOnly < minDateOnly) {
      return {
        isValid: false,
        error: TRANSFER_MESSAGES.PAST_TRANSFER_DATE,
        canTransfer: false
      }
    }
    
    if (dateOnly > maxDateOnly) {
      return {
        isValid: false,
        error: TRANSFER_MESSAGES.TRANSFER_DATE_TOO_FAR,
        canTransfer: false
      }
    }
    
    return { isValid: true, canTransfer: true }
  }

  /**
   * Get user's transfer scope based on role
   */
  static async getUserTransferScope(userId: string): Promise<{
    canTransferEmployees: boolean
    canApproveTransfers: boolean
    scope: 'store' | 'zone' | 'company' | 'none'
    storeId?: string
    zoneId?: string
  }> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, store_id, zone_id')
        .eq('id', userId)
        .single()

      if (error || !profile) {
        return {
          canTransferEmployees: false,
          canApproveTransfers: false,
          scope: 'none'
        }
      }

      switch (profile.role) {
        case 'HR':
          return {
            canTransferEmployees: true,
            canApproveTransfers: true,
            scope: 'company'
          }
        case 'ASM':
          return {
            canTransferEmployees: true,
            canApproveTransfers: true,
            scope: 'zone',
            zoneId: profile.zone_id || undefined
          }
        case 'STORE_MANAGER':
          return {
            canTransferEmployees: true,
            canApproveTransfers: true,
            scope: 'store',
            storeId: profile.store_id || undefined,
            zoneId: profile.zone_id || undefined
          }
        default:
          return {
            canTransferEmployees: false,
            canApproveTransfers: false,
            scope: 'none'
          }
      }
    } catch (error) {
      console.error('Error getting user transfer scope:', error)
      return {
        canTransferEmployees: false,
        canApproveTransfers: false,
        scope: 'none'
      }
    }
  }
}