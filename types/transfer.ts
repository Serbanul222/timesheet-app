// types/transfer.ts - FIXED: Updated constants for better UX
import { Database } from './database'

export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'

export interface Transfer {
  id: string
  employee_id: string
  from_store_id: string
  to_store_id: string
  from_zone_id: string
  to_zone_id: string
  initiated_by: string
  status: TransferStatus
  approved_by?: string
  transfer_date: string
  notes?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface TransferWithDetails extends Transfer {
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
  initiated_by_user?: {
    id: string
    full_name: string
    role: string
  }
  approved_by_user?: {
    id: string
    full_name: string
    role: string
  }
}

export interface CreateTransferRequest {
  employee_id: string
  to_store_id: string
  transfer_date: string
  notes?: string
}

export interface TransferValidationResult {
  isValid: boolean
  error?: string
  warning?: string
  canTransfer: boolean
}

export interface TransferPermissions {
  canCreateTransfer: boolean
  canApproveTransfer: boolean
  canRejectTransfer: boolean
  canCancelTransfer: boolean
  canViewTransfers: boolean
  allowedStores: string[]
  allowedZones: string[]
}

export interface TransferFilters {
  employee_id?: string
  from_store_id?: string
  to_store_id?: string
  status?: TransferStatus
  initiated_by?: string
  approved_by?: string
  transfer_date_from?: string
  transfer_date_to?: string
}

// Helper types for UI components
export interface TransferFormData {
  employee_id: string
  to_store_id: string
  transfer_date: Date
  notes?: string
}

export interface TransferOption {
  value: string
  label: string
  disabled?: boolean
  reason?: string
}

// Transfer action types for different UI contexts
export interface TransferActionContext {
  transfer: TransferWithDetails
  canApprove: boolean
  canReject: boolean
  canCancel: boolean
  canComplete: boolean
  userRole: string
}

// Transfer summary for dashboard/list views
export interface TransferSummary {
  id: string
  employeeName: string
  fromStoreName: string
  toStoreName: string
  status: TransferStatus
  transferDate: string
  createdAt: string
  initiatedBy: string
  approvedBy?: string
}

// Constants - FIXED: Updated for better user experience
export const TRANSFER_CONSTANTS = {
  DEFAULT_TRANSFER_DAYS: 1, // FIXED: Default to tomorrow instead of 7 days
  MIN_TRANSFER_DAYS: 0, // FIXED: Allow transfers starting today (0 days from now)
  MAX_TRANSFER_DAYS: 90, // Maximum days from now
  AUTO_APPROVE_SAME_ZONE: false, // Whether same-zone transfers auto-approve
  NOTIFICATION_DAYS_BEFORE: 3 // Days before transfer to send notifications
} as const

// Status display configurations
export const TRANSFER_STATUS_CONFIG = {
  pending: {
    label: 'În așteptare',
    color: 'yellow',
    description: 'Transferul așteaptă aprobare'
  },
  approved: {
    label: 'Aprobat',
    color: 'blue',
    description: 'Transferul a fost aprobat și va fi efectuat'
  },
  rejected: {
    label: 'Respins',
    color: 'red',
    description: 'Transferul a fost respins'
  },
  completed: {
    label: 'Finalizat',
    color: 'green',
    description: 'Transferul a fost completat cu succes'
  },
  cancelled: {
    label: 'Anulat',
    color: 'gray',
    description: 'Transferul a fost anulat înainte de aprobare'
  }
} as const

// Validation messages - FIXED: Updated error message
export const TRANSFER_MESSAGES = {
  INVALID_EMPLOYEE: 'Angajatul este necesar',
  INVALID_STORE: 'Magazinul destinație este necesar',
  INVALID_TRANSFER_DATE: 'Data de transfer este necesară',
  PAST_TRANSFER_DATE: 'Data de transfer nu poate fi înainte de azi', // FIXED: Updated message
  SAME_STORE: 'Nu se poate transfera în același magazin',
  EMPLOYEE_HAS_PENDING_TRANSFER: 'Angajatul are deja un transfer în așteptare',
  EMPLOYEE_IS_DELEGATED: 'Angajatul este momentan delegat și nu poate fi transferat',
  INSUFFICIENT_PERMISSIONS: 'Nu aveți permisiunea de a transfera la acest magazin',
  CROSS_ZONE_STORE_MANAGER: 'Store managerii nu pot transfera între zone diferite',
  EMPLOYEE_NOT_IN_STORE: 'Angajatul nu face parte din magazinul dvs.',
  STORE_NOT_FOUND: 'Magazinul destinație nu a fost găsit',
  TRANSFER_NOT_FOUND: 'Transferul nu a fost găsit',
  TRANSFER_ALREADY_PROCESSED: 'Transferul a fost deja procesat',
  CANNOT_APPROVE_OWN_TRANSFER: 'Nu puteți aproba propriul transfer',
  TRANSFER_DATE_TOO_FAR: 'Data de transfer este prea departe în viitor',
  EMPLOYEE_NOT_ACTIVE: 'Angajatul nu este activ'
} as const

// Transfer workflow states for UI
export type TransferWorkflowState = 
  | 'create' // Creating new transfer
  | 'pending' // Waiting for approval
  | 'review' // Reviewing for approval
  | 'scheduled' // Approved, waiting for transfer date
  | 'complete' // Transfer completed

// Transfer notification types
export interface TransferNotification {
  type: 'transfer_requested' | 'transfer_approved' | 'transfer_rejected' | 'transfer_completed' | 'transfer_cancelled'
  transferId: string
  recipientId: string
  title: string
  message: string
  actionUrl?: string
}

// Database table type from Supabase (for type safety)
export type TransferRow = Database['public']['Tables']['employee_transfers']['Row']
export type TransferInsert = Database['public']['Tables']['employee_transfers']['Insert']
export type TransferUpdate = Database['public']['Tables']['employee_transfers']['Update']