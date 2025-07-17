// lib/services/timesheetValidationService.ts - New Service
import { supabase } from '@/lib/supabase/client'

export class TimesheetValidationService {

  public static async validateAndGetEmployees(entries: any[]) {
    const employeeIds = entries.map(entry => entry.employeeId)
    
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .in('id', employeeIds)

    if (error) {
      throw new Error(`Failed to validate employees: ${error.message}`)
    }

    const validEmployees = new Map()
    const foundEmployeeIds = new Set()

    employees?.forEach(employee => {
      validEmployees.set(employee.id, employee)
      foundEmployeeIds.add(employee.id)
    })

    const invalidEmployees = entries
      .filter(entry => !foundEmployeeIds.has(entry.employeeId))
      .map(entry => ({
        employeeId: entry.employeeId,
        employeeName: entry.employeeName
      }))

    return { validEmployees, invalidEmployees }
  }
}