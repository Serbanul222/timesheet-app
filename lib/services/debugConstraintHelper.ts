// lib/services/debugConstraintHelper.ts
import { supabase } from '@/lib/supabase/client'

/**
 * Helper service to debug constraint violations
 */
export class DebugConstraintHelper {
  
  /**
   * Check what constraint violations might occur for an employee
   */
  static async debugEmployeeConstraints(employeeId: string, storeId?: string, zoneId?: string) {
    console.log('🔍 Debugging constraints for employee:', employeeId)
    
    try {
      // 1. Check if employee exists
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()
      
      if (empError || !employee) {
        console.error('❌ Employee not found:', empError)
        return { valid: false, reason: 'Employee does not exist' }
      }
      
      console.log('✅ Employee found:', {
        id: employee.id,
        name: employee.full_name,
        store_id: employee.store_id,
        zone_id: employee.zone_id
      })
      
      // 2. Check store consistency
      if (storeId && employee.store_id !== storeId) {
        console.error('❌ Store mismatch:', {
          employeeStore: employee.store_id,
          providedStore: storeId
        })
        return { 
          valid: false, 
          reason: `Employee belongs to store ${employee.store_id}, not ${storeId}` 
        }
      }
      
      // 3. Check zone consistency  
      if (zoneId && employee.zone_id !== zoneId) {
        console.error('❌ Zone mismatch:', {
          employeeZone: employee.zone_id,
          providedZone: zoneId
        })
        return { 
          valid: false, 
          reason: `Employee belongs to zone ${employee.zone_id}, not ${zoneId}` 
        }
      }
      
      // 4. Verify store exists
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('*')
        .eq('id', employee.store_id)
        .single()
        
      if (storeError || !store) {
        console.error('❌ Store not found:', storeError)
        return { 
          valid: false, 
          reason: `Employee's store ${employee.store_id} does not exist` 
        }
      }
      
      // 5. Verify zone exists
      const { data: zone, error: zoneError } = await supabase
        .from('zones')
        .select('*')
        .eq('id', employee.zone_id)
        .single()
        
      if (zoneError || !zone) {
        console.error('❌ Zone not found:', zoneError)
        return { 
          valid: false, 
          reason: `Employee's zone ${employee.zone_id} does not exist` 
        }
      }
      
      // 6. Check store-zone consistency
      if (store.zone_id !== employee.zone_id) {
        console.error('❌ Store-Zone mismatch:', {
          storeZone: store.zone_id,
          employeeZone: employee.zone_id
        })
        return { 
          valid: false, 
          reason: `Store ${store.name} belongs to zone ${store.zone_id}, but employee is in zone ${employee.zone_id}` 
        }
      }
      
      console.log('✅ All constraints satisfied:', {
        employee: employee.full_name,
        store: store.name,
        zone: zone.name
      })
      
      return { 
        valid: true, 
        employee, 
        store, 
        zone,
        reason: 'All constraints satisfied' 
      }
      
    } catch (error) {
      console.error('❌ Debug error:', error)
      return { 
        valid: false, 
        reason: `Debug error: ${error instanceof Error ? error.message : 'Unknown'}` 
      }
    }
  }
  
  /**
   * Check what the actual constraint is in the database
   */
  static async getConstraintDetails() {
    try {
      // Query to get constraint information (PostgreSQL specific)
      const { data, error } = await supabase.rpc('get_constraint_info', {
        table_name: 'timesheets',
        constraint_name: 'check_employee_reference'
      })
      
      if (error) {
        console.log('Could not get constraint details:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.log('Could not query constraint details:', error)
      return null
    }
  }
}

// Quick debug function you can call from console
export async function debugTimesheetSave(employeeId: string, gridData: any) {
  console.log('🐛 DEBUGGING TIMESHEET SAVE')
  console.log('Employee ID:', employeeId)
  console.log('Grid Data:', {
    storeId: gridData.storeId,
    startDate: gridData.startDate,
    endDate: gridData.endDate
  })
  
  const result = await DebugConstraintHelper.debugEmployeeConstraints(
    employeeId, 
    gridData.storeId
  )
  
  console.log('Debug Result:', result)
  return result
}