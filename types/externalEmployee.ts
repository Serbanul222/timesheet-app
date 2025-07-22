// types/externalEmployee.ts
import { z } from 'zod'

/**
 * Raw data structure from external Lensa Shop database
 */
export interface ExternalEmployeeRaw {
  email: string
  firstname: string | null
  lastname: string | null
  job_name: string | null
  customerId: number
}

/**
 * Processed employee data for internal use
 */
export interface ProcessedEmployeeData {
  email: string
  fullName: string
  firstName: string
  lastName: string
  position: string
  source: 'external_db'
  customerId: number 
}

/**
 * Employee lookup request parameters
 */
export interface EmployeeLookupRequest {
  email: string
  exactMatch?: boolean
  includeInactive?: boolean
}

/**
 * Employee lookup response
 */
export interface EmployeeLookupResponse {
  success: boolean
  found: boolean
  data?: ProcessedEmployeeData
  error?: string
  timestamp: string
  source: 'external_db'
}

/**
 * Employee search response for pattern matching
 */
export interface EmployeeSearchResponse {
  success: boolean
  results: ProcessedEmployeeData[]
  totalFound: number
  error?: string
  searchPattern: string
  timestamp: string
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// Validation schemas using Zod
export const ExternalEmployeeSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstname: z.string().nullable(),
  lastname: z.string().nullable(),
  job_name: z.string().nullable(),
  customerId: z.number()
})

export const EmployeeLookupRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email too long'),
  exactMatch: z.boolean().optional().default(true),
  includeInactive: z.boolean().optional().default(false)
})

export const EmployeeSearchRequestSchema = z.object({
  emailPattern: z.string()
    .min(3, 'Search pattern must be at least 3 characters')
    .max(100, 'Search pattern too long'),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
})

// Type guards
export const isExternalEmployeeRaw = (obj: any): obj is ExternalEmployeeRaw => {
  try {
    ExternalEmployeeSchema.parse(obj)
    return true
  } catch {
    return false
  }
}

export const isValidLookupRequest = (obj: any): obj is EmployeeLookupRequest => {
  try {
    EmployeeLookupRequestSchema.parse(obj)
    return true
  } catch {
    return false
  }
}

// Utility types
export type EmployeeLookupStatus = 'idle' | 'loading' | 'success' | 'error'

export interface EmployeeLookupState {
  status: EmployeeLookupStatus
  data?: ProcessedEmployeeData
  error?: string
  lastSearched?: string
}

// Constants
export const EXTERNAL_DB_CONFIG = {
  MAX_SEARCH_RESULTS: 50,
  MIN_SEARCH_LENGTH: 3,
  MAX_EMAIL_LENGTH: 255,
  SEARCH_DEBOUNCE_MS: 300,
  REQUEST_TIMEOUT_MS: 10000
} as const

export const LENSA_EMAIL_PATTERNS = {
  DOMAIN_PATTERN: /@lensa/i,
  NUMERIC_EXCLUSION: /[0-9]{10,}/,
  VALID_EMAIL_CHARS: /^[a-zA-Z0-9@._-]+$/
} as const

// Error types
export class ExternalEmployeeLookupError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ExternalEmployeeLookupError'
  }
}

export const LOOKUP_ERROR_CODES = {
  INVALID_EMAIL: 'INVALID_EMAIL',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TIMEOUT: 'TIMEOUT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED'
} as const

// Helper functions for data transformation
export const transformExternalEmployee = (
  raw: ExternalEmployeeRaw
): ProcessedEmployeeData => {
  const firstName = raw.firstname?.trim() || ''
  const lastName = raw.lastname?.trim() || ''
  
  const fullName = [firstName, lastName]
    .filter(Boolean)
    .join(' ') || 'Unknown Employee'
  
  return {
    email: raw.email,
    fullName,
    firstName,
    lastName,
    position: raw.job_name?.trim() || 'Staff',
    source: 'external_db',
    customerId: raw.customerId
  }
}

/**
 * Transform raw service data (different structure) to ProcessedEmployeeData
 * This handles the actual data structure returned by your external service
 */
export const transformServiceEmployee = (
  rawData: {
    customerId: number
    email: string
    fullName: string
    position: string
    originalJobName: string
  }
): ProcessedEmployeeData => {
  // Split fullName into firstName and lastName
  const nameParts = rawData.fullName.trim().split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

  return {
    email: rawData.email,
    fullName: rawData.fullName,
    firstName,
    lastName,
    position: rawData.position,
    source: 'external_db',
    customerId: rawData.customerId
  }
}

export const createLookupResponse = (
  found: boolean,
  data?: ProcessedEmployeeData,
  error?: string
): EmployeeLookupResponse => ({
  success: !error,
  found,
  data,
  error,
  timestamp: new Date().toISOString(),
  source: 'external_db'
})

export const createSearchResponse = (
  results: ProcessedEmployeeData[],
  searchPattern: string,
  error?: string
): EmployeeSearchResponse => ({
  success: !error,
  results,
  totalFound: results.length,
  error,
  searchPattern,
  timestamp: new Date().toISOString()
})

// Validation helpers
export const validateLensaEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false
  
  try {
    // Basic email validation
    z.string().email().parse(email)
    
    // Check for Lensa domain
    if (!LENSA_EMAIL_PATTERNS.DOMAIN_PATTERN.test(email)) return false
    
    // Exclude emails with long numeric patterns
    if (LENSA_EMAIL_PATTERNS.NUMERIC_EXCLUSION.test(email)) return false
    
    // Check for valid characters only
    if (!LENSA_EMAIL_PATTERNS.VALID_EMAIL_CHARS.test(email)) return false
    
    return true
  } catch {
    return false
  }
}

export const sanitizeEmailInput = (email: string): string => {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^\w@.-]/g, '')
    .substring(0, EXTERNAL_DB_CONFIG.MAX_EMAIL_LENGTH)
}