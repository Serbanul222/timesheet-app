// FILE: lib/services/timesheetDeleteService.ts - FINAL AND ROBUST VERSION
import { supabase } from '@/lib/supabase/client';

export interface EmployeeDeleteResult {
  success: boolean;
  error?: string;
  deletedEmployeeId?: string;
  deletedEmployeeName?: string;
}

export class TimesheetDeleteService {
  
  /**
   * Soft delete an employee - mark as inactive but preserve timesheet history
   */
  public static async deactivateEmployee(
    employeeId: string
  ): Promise<EmployeeDeleteResult> {
    try {
      // <-- DEBUG LOG 3.1: Verificăm dacă serviciul este atins
      console.log(`[LOG 3.1 - Service] Se execută update în Supabase pentru ID: ${employeeId}`);

      // Pasul 1: Preluăm informațiile despre angajat pentru a le returna la succes
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('id', employeeId)
        .single();
      if (fetchError) {
        throw new Error(`Failed to fetch employee: ${fetchError.message}`);
      }
      if (!employee) {
        throw new Error('Employee not found');
      }

      // Pasul 2: Executăm actualizarea și folosim .select() pentru a primi înapoi rândul modificat
      const { data: updatedData, error: deactivateError } = await supabase
        .from('employees')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId)
        .select('id'); // Cerem înapoi ID-ul pentru a confirma că s-a făcut update-ul

      if (deactivateError) {
        // <-- DEBUG LOG 3.2: Prindem eroarea specifică de la Supabase
        console.error('[LOG 3.2 - Service] EROARE SUPABASE:', deactivateError);
        throw new Error(`Failed to deactivate employee: ${deactivateError.message}`);
      }
      
      // Pasul 3: [NOUA LOGICĂ] Verificăm dacă actualizarea chiar a modificat ceva.
      // Dacă RLS blochează operațiunea, 'updatedData' va fi un array gol ([]) sau null.
      if (!updatedData || updatedData.length === 0) {
        console.error('[LOG 3.2b - Service] EROARE: Update-ul nu a returnat date. Verificati RLS!');
        throw new Error('Update failed, possibly due to database permissions (RLS).');
      }

      // <-- DEBUG LOG 3.3: Confirmăm succesul operațiunii
      console.log(`[LOG 3.3 - Service] Update în Supabase a reușit și a returnat ${updatedData.length} rând(uri).`);
      
      return {
        success: true,
        deletedEmployeeId: employeeId,
        deletedEmployeeName: employee.full_name
      };

    } catch (error) {
      console.error('TimesheetDeleteService error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Bulk deactivate multiple employees
   */
  public static async deactivateBulkEmployees(
    employeeIds: string[]
  ): Promise<EmployeeDeleteResult> {
    try {
      const { data: employees, error: fetchError } = await supabase
        .from('employees')
        .select('id, full_name')
        .in('id', employeeIds);
      if (fetchError) {
        throw new Error(`Failed to fetch employees: ${fetchError.message}`);
      }
      const employeeNames = employees?.map(emp => emp.full_name) || [];

      // Aplicăm aceeași logică robustă și aici
      const { data: updatedData, error: deactivateError } = await supabase
        .from('employees')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', employeeIds)
        .select('id'); // Cerem înapoi ID-urile pentru confirmare

      if (deactivateError) {
        throw new Error(`Failed to deactivate employees: ${deactivateError.message}`);
      }

      if (!updatedData || updatedData.length !== employeeIds.length) {
        console.warn(`[Service] Avertisment: S-a încercat dezactivarea a ${employeeIds.length} angajați, dar doar ${updatedData?.length || 0} au fost modificați. Verificați RLS.`);
        // Decidem să continuăm, dar avertizăm în consolă. Se poate arunca o eroare dacă se dorește un comportament mai strict.
      }
      
      if (!updatedData || updatedData.length === 0) {
        throw new Error('Bulk update failed, possibly due to database permissions (RLS).');
      }

      return {
        success: true,
        deletedEmployeeName: employeeNames.join(', ')
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Reactivate an employee (undo soft delete)
   */
  public static async reactivateEmployee(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: updatedData, error } = await supabase
        .from('employees')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId)
        .select('id'); // Cerem înapoi ID-ul pentru confirmare

      if (error) {
        throw new Error(`Failed to reactivate employee: ${error.message}`);
      }

      if (!updatedData || updatedData.length === 0) {
        throw new Error('Reactivation failed, possibly due to database permissions (RLS).');
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}