// lib/validation/delegationValidationRules.ts
import { Database } from '@/types/database'
import { 
  CreateDelegationRequest, 
  DelegationValidationResult, 
  DELEGATION_CONSTANTS, 
  DELEGATION_MESSAGES 
} from '@/types/delegation'

type Profile = Database['public']['Tables']['profiles']['Row']
type Employee = Database['public']['Tables']['employees']['Row']
type Store = Database['public']['Tables']['stores']['Row']
type Zone = Database['public']['Tables']['zones']['Row']

export interface DelegationValidationContext {
  user: Profile
  employee: Employee
  fromStore: Store
  toStore: Store
  fromZone: Zone
  toZone: Zone
  existingDelegations: any[]
  request: CreateDelegationRequest
}

/**
 * Business rules for employee delegation validation
 */
export class DelegationValidationRules {
  
  /**
   * Validate delegation request comprehensively
   */
  static validateDelegationRequest(context: DelegationValidationContext): DelegationValidationResult {
    const { user, employee, fromStore, toStore, fromZone, toZone, request } = context
    
    // Rule 1: Basic field validation
    const basicValidation = this.validateBasicFields(request)
    if (!basicValidation.isValid) return basicValidation
    
    // Rule 2: Permission validation
    const permissionValidation = this.validatePermissions(user, fromStore, toStore, fromZone, toZone)
    if (!permissionValidation.isValid) return permissionValidation
    
    // Rule 3: Employee validation
    const employeeValidation = this.validateEmployee(employee, fromStore, user)
    if (!employeeValidation.isValid) return employeeValidation
    
    // Rule 4: Store validation
    const storeValidation = this.validateStores(fromStore, toStore)
    if (!storeValidation.isValid) return storeValidation
    
    // Rule 5: Date validation
    const dateValidation = this.validateDates(request.valid_from, request.valid_until)
    if (!dateValidation.isValid) return dateValidation
    
    // Rule 6: Conflict validation
    const conflictValidation = this.validateConflicts(context)
    if (!conflictValidation.isValid) return conflictValidation
    
    return { isValid: true, canDelegate: true }
  }
  
  /**
   * Rule 1: Validate basic required fields
   */
  private static validateBasicFields(request: CreateDelegationRequest): DelegationValidationResult {
    if (!request.employee_id) {
      return {
        isValid: false,
        error: DELEGATION_MESSAGES.INVALID_EMPLOYEE,
        canDelegate: false
      }
    }
    
    if (!request.to_store_id) {
      return {
        isValid: false,
        error: DELEGATION_MESSAGES.INVALID_STORE,
        canDelegate: false
      }
    }
    
    if (!request.valid_from || !request.valid_until) {
      return {
        isValid: false,
        error: DELEGATION_MESSAGES.INVALID_DATES,
        canDelegate: false
      }
    }
    
    return { isValid: true, canDelegate: true }
  }
  
  /**
   * Rule 2: Validate user permissions for delegation
   */
  private static validatePermissions(
    user: Profile,
    fromStore: Store,
    toStore: Store,
    fromZone: Zone,
    toZone: Zone
  ): DelegationValidationResult {
    
    switch (user.role) {
      case 'HR':
        // HR can delegate anywhere
        return { isValid: true, canDelegate: true }
        
      case 'ASM':
        // ASM can delegate within their zone
        if (user.zone_id === fromZone.id && user.zone_id === toZone.id) {
          return { isValid: true, canDelegate: true }
        }
        return {
          isValid: false,
          error: 'ASM can only delegate within their zone',
          canDelegate: false
        }
        
      case 'STORE_MANAGER':
        // Store Manager can only delegate within same zone
        if (user.store_id === fromStore.id) {
          if (fromZone.id === toZone.id) {
            return { isValid: true, canDelegate: true }
          }
          return {
            isValid: false,
            error: DELEGATION_MESSAGES.CROSS_ZONE_RESTRICTION,
            canDelegate: false
          }
        }
        return {
          isValid: false,
          error: 'You can only delegate employees from your store',
          canDelegate: false
        }
        
      default:
        return {
          isValid: false,
          error: DELEGATION_MESSAGES.INSUFFICIENT_PERMISSIONS,
          canDelegate: false
        }
    }
  }
  
  /**
   * Rule 3: Validate employee eligibility
   */
  private static validateEmployee(
    employee: Employee,
    fromStore: Store,
    user: Profile
  ): DelegationValidationResult {
    
    // Employee must belong to the from_store
    if (employee.store_id !== fromStore.id) {
      return {
        isValid: false,
        error: DELEGATION_MESSAGES.EMPLOYEE_NOT_FOUND,
        canDelegate: false
      }
    }
    
    // Store managers can only delegate their own employees
    if (user.role === 'STORE_MANAGER' && user.store_id !== employee.store_id) {
      return {
        isValid: false,
        error: 'You can only delegate employees from your store',
        canDelegate: false
      }
    }
    
    return { isValid: true, canDelegate: true }
  }
  
  /**
   * Rule 4: Validate store relationships
   */
  private static validateStores(fromStore: Store, toStore: Store): DelegationValidationResult {
  // ✅ NEW: Cannot delegate to the same store (this was the missing validation)
  if (fromStore.id === toStore.id) {
    return {
      isValid: false,
      error: 'Cannot delegate employee to their current store. Employee is already assigned here.',
      canDelegate: false
    }
  }
  
  return { isValid: true, canDelegate: true }
}

// ✅ NEW: Additional helper method for UI components
/**
 * Check if a store is valid for delegation for a specific employee
 */
static isStoreValidForDelegation(
  employee: Employee,
  targetStoreId: string
): { isValid: boolean; reason?: string } {
  
  // Employee cannot be delegated to their own store
  if (employee.store_id === targetStoreId) {
    return {
      isValid: false,
      reason: `${employee.full_name} already belongs to this store`
    }
  }
  
  return { isValid: true }
}
  
  /**
   * Rule 5: Validate delegation dates
   */
  private static validateDates(validFrom: string, validUntil: string): DelegationValidationResult {
    const startDate = new Date(validFrom)
    const endDate = new Date(validUntil)
    const now = new Date()
    
    // Start date cannot be in the past (allow same day)
    if (startDate.toDateString() < now.toDateString()) {
      return {
        isValid: false,
        error: DELEGATION_MESSAGES.PAST_DATE,
        canDelegate: false
      }
    }
    
    // End date must be after start date
    if (endDate <= startDate) {
      return {
        isValid: false,
        error: 'End date must be after start date',
        canDelegate: false
      }
    }
    
    // Check maximum delegation duration
    const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    if (durationDays > DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS) {
      return {
        isValid: false,
        error: `Delegation cannot exceed ${DELEGATION_CONSTANTS.MAX_DELEGATION_DAYS} days`,
        canDelegate: false
      }
    }
    
    if (durationDays < DELEGATION_CONSTANTS.MIN_DELEGATION_DAYS) {
      return {
        isValid: false,
        error: `Delegation must be at least ${DELEGATION_CONSTANTS.MIN_DELEGATION_DAYS} day`,
        canDelegate: false
      }
    }
    
    return { isValid: true, canDelegate: true }
  }
  
  /**
   * Rule 6: Validate conflicts with existing delegations
   */
  private static validateConflicts(context: DelegationValidationContext): DelegationValidationResult {
    const { employee, request, existingDelegations } = context
    
    // Check for overlapping active delegations
    const startDate = new Date(request.valid_from)
    const endDate = new Date(request.valid_until)
    
    const conflictingDelegation = existingDelegations.find(delegation => {
      if (delegation.employee_id !== employee.id) return false
      if (delegation.status !== 'active') return false
      
      const existingStart = new Date(delegation.valid_from)
      const existingEnd = new Date(delegation.valid_until)
      
      // Check for date overlap
      return (startDate <= existingEnd && endDate >= existingStart)
    })
    
    if (conflictingDelegation) {
      return {
        isValid: false,
        error: DELEGATION_MESSAGES.OVERLAPPING_DELEGATION,
        canDelegate: false
      }
    }
    
    return { isValid: true, canDelegate: true }
  }
  
  /**
   * Check if delegation is currently active
   */
  static isDelegationActive(delegation: any): boolean {
    if (delegation.status !== 'active') return false
    
    const now = new Date()
    const startDate = new Date(delegation.valid_from)
    const endDate = new Date(delegation.valid_until)
    
    return now >= startDate && now <= endDate
  }
  
  /**
   * Check if delegation is expiring soon
   */
  static isDelegationExpiringSoon(delegation: any, days: number = DELEGATION_CONSTANTS.WARNING_DAYS_BEFORE_EXPIRY): boolean {
    if (!this.isDelegationActive(delegation)) return false
    
    const now = new Date()
    const endDate = new Date(delegation.valid_until)
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return daysUntilExpiry <= days
  }
  
  /**
   * Get allowed stores for delegation based on user role
   */
  static getAllowedStores(user: Profile, allStores: Store[]): Store[] {
    switch (user.role) {
      case 'HR':
        return allStores
        
      case 'ASM':
        return allStores.filter(store => store.zone_id === user.zone_id)
        
      case 'STORE_MANAGER':
        return allStores.filter(store => 
          store.zone_id === user.zone_id && store.id !== user.store_id
        )
        
      default:
        return []
    }
  }
  
  /**
   * Calculate delegation duration in days
   */
  static calculateDelegationDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }
}