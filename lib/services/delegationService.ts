// lib/services/delegationService.ts - Simplified for current schema
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { 
  CreateDelegationRequest, 
  Delegation, 
  DelegationWithDetails, 
  DelegationFilters,
  DelegationValidationResult 
} from '@/types/delegation'
import { DelegationValidationRules } from '@/lib/validation/delegationValidationRules'

type Profile = Database['public']['Tables']['profiles']['Row']
type Employee = Database['public']['Tables']['employees']['Row']
type Store = Database['public']['Tables']['stores']['Row']
type Zone = Database['public']['Tables']['zones']['Row']

/**
 * Service for managing employee delegations - Simplified version
 */
export class DelegationService {
  
  /**
   * Create a new delegation
   */
  static async createDelegation(
    request: CreateDelegationRequest,
    userId: string
  ): Promise<{ success: boolean; delegation?: Delegation; error?: string }> {
    try {
      // Validate the delegation request
      const validationResult = await this.validateDelegationRequest(request, userId)
      
      if (!validationResult.isValid) {
        return { success: false, error: validationResult.error }
      }
      
      // Get user and employee data for delegation creation
      const { user, employee, fromStore, toStore } = await this.getDelegationContext(request, userId)
      
      // Create delegation record - simplified without zone fields for now
      const delegationData = {
        employee_id: request.employee_id,
        from_store_id: employee.store_id,
        to_store_id: request.to_store_id,
        delegated_by: userId,
        valid_from: request.valid_from,
        valid_until: request.valid_until,
        status: 'active' as const,
        notes: request.notes || null
      }
      
      const { data, error } = await supabase
        .from('employee_delegations')
        .insert(delegationData)
        .select()
        .single()
      
      if (error) {
        console.error('DelegationService: Failed to create delegation:', error)
        throw new Error(`Failed to create delegation: ${error.message}`)
      }
      
      console.log('DelegationService: Delegation created successfully:', data.id)
      return { success: true, delegation: data }
      
    } catch (error) {
      console.error('DelegationService: Create delegation error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create delegation' 
      }
    }
  }
  
  /**
   * Get delegations with optional filters - simplified query
   */
  static async getDelegations(filters: DelegationFilters = {}): Promise<DelegationWithDetails[]> {
    try {
      let query = supabase
        .from('employee_delegations')
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_delegations_from_store_id_fkey(id, name),
          to_store:stores!employee_delegations_to_store_id_fkey(id, name),
          delegated_by_user:profiles!employee_delegations_delegated_by_fkey(id, full_name, role)
        `)
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (filters.employee_id) {
        query = query.eq('employee_id', filters.employee_id)
      }
      
      if (filters.from_store_id) {
        query = query.eq('from_store_id', filters.from_store_id)
      }
      
      if (filters.to_store_id) {
        query = query.eq('to_store_id', filters.to_store_id)
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.valid_on) {
        const date = filters.valid_on
        query = query.lte('valid_from', date).gte('valid_until', date)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('DelegationService: Failed to get delegations:', error)
        throw new Error(`Failed to get delegations: ${error.message}`)
      }
      
      return data || []
      
    } catch (error) {
      console.error('DelegationService: Get delegations error:', error)
      throw error
    }
  }
  
  /**
   * Get active delegations for an employee
   */
  static async getActiveDelegation(employeeId: string): Promise<DelegationWithDetails | null> {
    try {
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('employee_delegations')
        .select(`
          *,
          employee:employees(id, full_name, position, employee_code),
          from_store:stores!employee_delegations_from_store_id_fkey(id, name),
          to_store:stores!employee_delegations_to_store_id_fkey(id, name),
          delegated_by_user:profiles!employee_delegations_delegated_by_fkey(id, full_name, role)
        `)
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .lte('valid_from', now)
        .gte('valid_until', now)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No active delegation found
          return null
        }
        throw new Error(`Failed to get active delegation: ${error.message}`)
      }
      
      return data
      
    } catch (error) {
      console.error('DelegationService: Get active delegation error:', error)
      throw error
    }
  }
  
  /**
   * Revoke a delegation
   */
  static async revokeDelegation(
    delegationId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if user has permission to revoke
      const { data: delegation, error: fetchError } = await supabase
        .from('employee_delegations')
        .select('*, delegated_by')
        .eq('id', delegationId)
        .single()
      
      if (fetchError) {
        throw new Error(`Delegation not found: ${fetchError.message}`)
      }
      
      // Only the delegating user or HR can revoke
      const { data: user } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (delegation.delegated_by !== userId && user?.role !== 'HR') {
        return { success: false, error: 'You can only revoke delegations you created' }
      }
      
      // Update delegation status
      const { error } = await supabase
        .from('employee_delegations')
        .update({ 
          status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('id', delegationId)
      
      if (error) {
        throw new Error(`Failed to revoke delegation: ${error.message}`)
      }
      
      console.log('DelegationService: Delegation revoked successfully:', delegationId)
      return { success: true }
      
    } catch (error) {
      console.error('DelegationService: Revoke delegation error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to revoke delegation' 
      }
    }
  }
  
  /**
   * Get employees available for delegation (based on user permissions)
   */
  static async getAvailableEmployees(userId: string): Promise<Employee[]> {
    try {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError) {
        throw new Error(`Failed to get user: ${userError.message}`)
      }
      
      let query = supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true })
      
      // Filter based on user role
      switch (user.role) {
        case 'HR':
          // HR can delegate any employee
          break
          
        case 'ASM':
          // ASM can delegate employees in their zone
          if (user.zone_id) {
            query = query.eq('zone_id', user.zone_id)
          }
          break
          
        case 'STORE_MANAGER':
          // Store managers can only delegate their own employees
          if (user.store_id) {
            query = query.eq('store_id', user.store_id)
          }
          break
          
        default:
          return []
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to get available employees: ${error.message}`)
      }
      
      return data || []
      
    } catch (error) {
      console.error('DelegationService: Get available employees error:', error)
      throw error
    }
  }
  
  /**
   * Get available destination stores for delegation
   */
  static async getAvailableStores(userId: string): Promise<Store[]> {
    try {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError) {
        throw new Error(`Failed to get user: ${userError.message}`)
      }
      
      let query = supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true })
      
      // Filter based on user role
      switch (user.role) {
        case 'HR':
          // HR can delegate to any store
          break
          
        case 'ASM':
          // ASM can delegate within their zone
          if (user.zone_id) {
            query = query.eq('zone_id', user.zone_id)
          }
          break
          
        case 'STORE_MANAGER':
          // Store managers can delegate within same zone, exclude their own store
          if (user.zone_id && user.store_id) {
            query = query.eq('zone_id', user.zone_id).neq('id', user.store_id)
          }
          break
          
        default:
          return []
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new Error(`Failed to get available stores: ${error.message}`)
      }
      
      return data || []
      
    } catch (error) {
      console.error('DelegationService: Get available stores error:', error)
      throw error
    }
  }
  
  /**
   * Helper method to validate delegation request
   */
private static async validateDelegationRequest(
  request: CreateDelegationRequest,
  userId: string
): Promise<DelegationValidationResult> {
  try {
    // Basic client-side validation first
    if (!request.employee_id || !request.to_store_id || !request.valid_from || !request.valid_until) {
      return { isValid: false, error: 'Missing required fields', canDelegate: false }
    }

    // ✅ NEW: Get employee to check their current store
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('store_id, full_name')
      .eq('id', request.employee_id)
      .single()

    if (employeeError || !employee) {
      return { isValid: false, error: 'Employee not found', canDelegate: false }
    }

    // ✅ NEW: Check if trying to delegate to same store
    if (employee.store_id === request.to_store_id) {
      return { 
        isValid: false, 
        error: `Cannot delegate ${employee.full_name} to their current store. They already work there.`, 
        canDelegate: false 
      }
    }
    
    const startDate = new Date(request.valid_from + 'T00:00:00')
    const endDate = new Date(request.valid_until + 'T23:59:59')
    const now = new Date()
    
    // Set now to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    
    if (startDay < today) {
      return { isValid: false, error: 'Start date cannot be in the past', canDelegate: false }
    }
    
    if (endDate <= startDate) {
      return { isValid: false, error: 'End date must be after start date', canDelegate: false }
    }
    
    // Check for existing active delegations
    const existing = await this.getDelegations({
      employee_id: request.employee_id,
      status: 'active'
    })
    
    if (existing.length > 0) {
      return { isValid: false, error: 'Employee already has an active delegation', canDelegate: false }
    }
    
    return { isValid: true, canDelegate: true }
    
  } catch (error) {
    console.error('DelegationService: Validation error:', error)
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
      canDelegate: false
    }
  }
}
  
  /**
   * Helper method to get delegation context data
   */
  private static async getDelegationContext(
    request: CreateDelegationRequest,
    userId: string
  ): Promise<{
    user: Profile
    employee: Employee
    fromStore: Store
    toStore: Store
  }> {
    try {
      // Get user
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError) {
        throw new Error(`User not found: ${userError.message}`)
      }
      
      // Get employee
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', request.employee_id)
        .single()
      
      if (employeeError) {
        throw new Error(`Employee not found: ${employeeError.message}`)
      }
      
      // Get from store
      const { data: fromStore, error: fromStoreError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', employee.store_id)
        .single()
      
      if (fromStoreError) {
        throw new Error(`From store not found: ${fromStoreError.message}`)
      }
      
      // Get to store
      const { data: toStore, error: toStoreError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', request.to_store_id)
        .single()
      
      if (toStoreError) {
        throw new Error(`To store not found: ${toStoreError.message}`)
      }
      
      return {
        user,
        employee,
        fromStore,
        toStore
      }
      
    } catch (error) {
      console.error('DelegationService: Get context error:', error)
      throw error
    }
  }
}