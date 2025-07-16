// types/delegation.ts
import { Database } from './database'

export type DelegationStatus = 'active' | 'expired' | 'revoked' | 'pending'

export interface Delegation {
  id: string
  employee_id: string
  from_store_id: string
  to_store_id: string
  from_zone_id: string
  to_zone_id: string
  delegated_by: string
  valid_from: string
  valid_until: string
  status: DelegationStatus
  auto_return: boolean
  extension_count: number
  notes?: string
  created_at: string
  updated_at: string
  expired_at?: string
}

export interface DelegationWithDetails extends Delegation {
  employee?: {
    id: string
    full_name: string
    position?: string
    employee_code?: string
  }
  from_store?: {
    id: string
    name: string
  }
  to_store?: {
    id: string
    name: string
  }
  from_zone?: {
    id: string
    name: string
  }
  to_zone?: {
    id: string
    name: string
  }
  delegated_by_user?: {
    id: string
    full_name: string
    role: string
  }
}

export interface CreateDelegationRequest {
  employee_id: string
  to_store_id: string
  valid_from: string
  valid_until: string
  notes?: string
}

export interface DelegationValidationResult {
  isValid: boolean
  error?: string
  warning?: string
  canDelegate: boolean
}

export interface DelegationPermissions {
  canCreateDelegation: boolean
  canRevokeDelegation: boolean
  canExtendDelegation: boolean
  canViewDelegations: boolean
  allowedStores: string[]
  allowedZones: string[]
}

export interface DelegationFilters {
  employee_id?: string
  from_store_id?: string
  to_store_id?: string
  status?: DelegationStatus
  valid_on?: string // Check if delegation is valid on specific date
}

// Helper types for UI
export interface DelegationFormData {
  employee_id: string
  to_store_id: string
  valid_from: Date
  valid_until: Date
  notes?: string
}

export interface DelegationOption {
  value: string
  label: string
  disabled?: boolean
  reason?: string
}

// Constants
export const DELEGATION_CONSTANTS = {
  MAX_DELEGATION_DAYS: 90,
  DEFAULT_DELEGATION_DAYS: 30,
  MIN_DELEGATION_DAYS: 1,
  MAX_EXTENSIONS: 3,
  WARNING_DAYS_BEFORE_EXPIRY: 7
} as const

// Validation messages
export const DELEGATION_MESSAGES = {
  INVALID_EMPLOYEE: 'Employee is required',
  INVALID_STORE: 'Destination store is required',
  INVALID_DATES: 'Valid dates are required',
  PAST_DATE: 'Start date cannot be in the past',
  INVALID_DURATION: 'Delegation duration exceeds maximum allowed',
  SAME_STORE: 'Cannot delegate to the same store',
  OVERLAPPING_DELEGATION: 'Employee already has an active delegation',
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to delegate to this store',
  CROSS_ZONE_RESTRICTION: 'Store managers cannot delegate across zones',
  EMPLOYEE_NOT_FOUND: 'Employee not found in your store',
  STORE_NOT_FOUND: 'Destination store not found',
  MAX_EXTENSIONS_REACHED: 'Maximum number of extensions reached'
} as const