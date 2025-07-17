// lib/services/timesheetDBService.ts - New Service
import { supabase } from '@/lib/supabase/client'

export class TimesheetDBService {

  public static async findExistingGrid(
    storeId: string,
    startDate: string,
    endDate: string,
    sessionId: string
  ) {
    const { data, error } = await supabase
      .from('timesheets')
      .select('id, daily_entries, notes')
      .eq('store_id', storeId)
      .eq('period_start', startDate.split('T')[0])
      .eq('period_end', endDate.split('T')[0])

    if (error) {
      throw new Error(`Failed to check existing grid: ${error.message}`)
    }

    if (data && data.length > 0) {
      const sessionMatch = data.find(grid => 
        grid.notes?.includes(sessionId) ||
        (grid.daily_entries && 
         typeof grid.daily_entries === 'object' && 
         JSON.stringify(grid.daily_entries).includes(sessionId))
      )
      return sessionMatch || data[0]
    }

    return null
  }

  public static async createNewGrid(gridData: any): Promise<{ gridId: string; isUpdate: boolean }> {
    const { data, error } = await supabase
      .from('timesheets')
      .insert(gridData)
      .select('id')
      .single()

    if (error) {
      console.error('❌ Database insert error:', error)
      console.error('📋 Data that failed to insert:', gridData)
      throw new Error(`Failed to create grid: ${error.message}`)
    }

    return {
      gridId: data.id,
      isUpdate: false
    }
  }

  public static async updateExistingGrid(gridId: string, gridData: any): Promise<{ gridId: string; isUpdate: boolean }> {
    const { data, error } = await supabase
      .from('timesheets')
      .update({
        ...gridData,
        updated_at: new Date().toISOString()
      })
      .eq('id', gridId)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to update grid: ${error.message}`)
    }

    return {
      gridId: data.id,
      isUpdate: true
    }
  }
}