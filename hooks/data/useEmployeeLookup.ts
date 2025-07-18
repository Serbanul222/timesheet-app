// hooks/data/useEmployeeLookup.ts
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ProcessedEmployeeData,
  EmployeeLookupResponse,
  EmployeeSearchResponse,
  EmployeeLookupState,
  validateLensaEmail,
  sanitizeEmailInput,
  EXTERNAL_DB_CONFIG
} from '@/types/externalEmployee'
import { toast } from 'sonner'

interface UseEmployeeLookupOptions {
  enabled?: boolean
  debounceMs?: number
  onFound?: (employee: ProcessedEmployeeData) => void
  onNotFound?: (email: string) => void
  onError?: (error: string) => void
}

interface UseEmployeeLookupReturn {
  // State
  state: EmployeeLookupState
  isLoading: boolean
  
  // Actions
  lookupEmployee: (email: string) => Promise<ProcessedEmployeeData | null>
  searchEmployees: (pattern: string) => Promise<ProcessedEmployeeData[]>
  clearResults: () => void
  
  // Utilities
  isValidEmail: (email: string) => boolean
  canLookup: boolean
}

/**
 * Hook for looking up employees from external Lensa database
 */
export function useEmployeeLookup(options: UseEmployeeLookupOptions = {}): UseEmployeeLookupReturn {
  const {
    enabled = true,
    debounceMs = EXTERNAL_DB_CONFIG.SEARCH_DEBOUNCE_MS,
    onFound,
    onNotFound,
    onError
  } = options

  const [state, setState] = useState<EmployeeLookupState>({
    status: 'idle'
  })

  const [searchResults, setSearchResults] = useState<ProcessedEmployeeData[]>([])
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Lookup single employee by exact email
   */
  const lookupEmployee = useCallback(async (email: string): Promise<ProcessedEmployeeData | null> => {
    if (!enabled) {
      console.warn('Employee lookup is disabled')
      return null
    }

    const sanitizedEmail = sanitizeEmailInput(email)
    
    // Validate email format
    if (!validateLensaEmail(sanitizedEmail)) {
      const error = 'Invalid Lensa email format'
      setState(prev => ({ ...prev, status: 'error', error }))
      onError?.(error)
      return null
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setState(prev => ({ 
      ...prev, 
      status: 'loading', 
      error: undefined,
      lastSearched: sanitizedEmail 
    }))

    try {
      console.log('Looking up employee:', sanitizedEmail)

      const response = await fetch(
        `/api/employees/lookup?email=${encodeURIComponent(sanitizedEmail)}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: EmployeeLookupResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Lookup failed')
      }

      if (result.found && result.data) {
        setState(prev => ({
          ...prev,
          status: 'success',
          data: result.data,
          error: undefined
        }))
        
        onFound?.(result.data)
        
        toast.success('Employee found!', {
          description: `Found: ${result.data.fullName} (${result.data.position})`
        })
        
        return result.data
      } else {
        setState(prev => ({ 
          ...prev, 
          status: 'success', 
          data: undefined,
          error: undefined 
        }))
        
        onNotFound?.(sanitizedEmail)
        
        toast.info('Employee not found', {
          description: `No employee found with email: ${sanitizedEmail}`
        })
        
        return null
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Employee lookup aborted')
        return null
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Employee lookup failed:', errorMessage)
      
      setState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
        data: undefined
      }))
      
      onError?.(errorMessage)
      
      toast.error('Lookup failed', {
        description: errorMessage
      })
      
      return null
    }
  }, [enabled, onFound, onNotFound, onError])

  /**
   * Search employees by email pattern
   */
  const searchEmployees = useCallback(async (pattern: string): Promise<ProcessedEmployeeData[]> => {
    if (!enabled) {
      console.warn('Employee search is disabled')
      return []
    }

    const sanitizedPattern = sanitizeEmailInput(pattern)
    
    if (sanitizedPattern.length < EXTERNAL_DB_CONFIG.MIN_SEARCH_LENGTH) {
      setSearchResults([])
      return []
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      console.log('Searching employees:', sanitizedPattern)

      const response = await fetch('/api/employees/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailPattern: sanitizedPattern,
          limit: EXTERNAL_DB_CONFIG.MAX_SEARCH_RESULTS
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: EmployeeSearchResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Search failed')
      }

      setSearchResults(result.results)
      return result.results

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Employee search aborted')
        return []
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Employee search failed:', errorMessage)
      
      toast.error('Search failed', {
        description: errorMessage
      })
      
      return []
    }
  }, [enabled])

  /**
   * Debounced lookup function
   */
  const debouncedLookup = useCallback((email: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      lookupEmployee(email)
    }, debounceMs)
  }, [lookupEmployee, debounceMs])

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback((pattern: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      searchEmployees(pattern)
    }, debounceMs)
  }, [searchEmployees, debounceMs])

  /**
   * Clear all results and reset state
   */
  const clearResults = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setState({
      status: 'idle'
    })
    setSearchResults([])
  }, [])

  /**
   * Check if email is valid for lookup
   */
  const isValidEmail = useCallback((email: string): boolean => {
    return validateLensaEmail(sanitizeEmailInput(email))
  }, [])

  return {
    // State
    state,
    isLoading: state.status === 'loading',
    
    // Actions
    lookupEmployee,
    searchEmployees,
    clearResults,
    
    // Debounced actions
    debouncedLookup,
    debouncedSearch,
    
    // Search results
    searchResults,
    
    // Utilities
    isValidEmail,
    canLookup: enabled && state.status !== 'loading'
  }
}

/**
 * Simplified hook for basic employee lookup
 */
export function useSimpleEmployeeLookup() {
  const [email, setEmail] = useState('')
  const [employee, setEmployee] = useState<ProcessedEmployeeData | null>(null)
  
  const { lookupEmployee, isLoading, isValidEmail } = useEmployeeLookup({
    onFound: setEmployee,
    onNotFound: () => setEmployee(null)
  })

  const handleEmailChange = useCallback((newEmail: string) => {
    setEmail(newEmail)
    if (isValidEmail(newEmail)) {
      lookupEmployee(newEmail)
    } else {
      setEmployee(null)
    }
  }, [lookupEmployee, isValidEmail])

  return {
    email,
    employee,
    isLoading,
    isValidEmail,
    setEmail: handleEmailChange,
    clearEmployee: () => setEmployee(null)
  }
}