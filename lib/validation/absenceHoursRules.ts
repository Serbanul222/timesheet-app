// lib/validation/absenceHoursRules.ts
import { DayData, DayStatus } from '@/types/timesheet-grid'
import { AbsenceType } from '@/lib/services/absenceTypesService'

export interface EffectiveHoursResult {
  hours: number
  source: 'explicit' | 'absence_default'
  isFullDayAbsence: boolean
}

/**
 * Centralized business rule for calculating effective working hours.
 * Full-day absences (concediu de odihna, concediu medical etc) count as 8 hours.
 */
export class AbsenceHoursRules {
  
  /**
   * Calculate effective hours for a single day considering absence rules
   */
  static calculateEffectiveHours(
    dayData: DayData | null | undefined,
    absenceTypes: AbsenceType[] = []
  ): EffectiveHoursResult {
    
    if (!dayData) {
      return { hours: 0, source: 'explicit', isFullDayAbsence: false }
    }
    
    // Check if status represents a full-day absence
    if (dayData.status && dayData.status !== 'alege') {
      const absenceType = absenceTypes.find(type => type.code === dayData.status)
      
      if (absenceType && !absenceType.requires_hours) {
        return { 
          hours: 8, 
          source: 'absence_default', 
          isFullDayAbsence: true 
        }
      }
    }
    
    // For all other cases (work time, partial absences), use explicit hours
    return { 
      hours: dayData.hours || 0, 
      source: 'explicit', 
      isFullDayAbsence: false 
    }
  }
  
  /**
   * Calculate total effective hours for multiple days
   */
  static calculateTotalEffectiveHours(
    days: Record<string, DayData>,
    absenceTypes: AbsenceType[] = []
  ): number {
    if (!days) return 0
    
    let total = 0
    for (const date in days) {
      const result = this.calculateEffectiveHours(days[date], absenceTypes)
      total += result.hours
    }
    
    return Math.round(total * 100) / 100
  }
  
  /**
   * Check if a status is a full-day absence that should disable time input
   */
  static isFullDayAbsence(
    status: DayStatus,
    absenceTypes: AbsenceType[] = []
  ): boolean {
    if (!status || status === 'alege') return false
    
    const absenceType = absenceTypes.find(type => type.code === status)
    return absenceType ? !absenceType.requires_hours : false
  }
  
  /**
   * Get the data structure for a full-day absence (auto-clear time fields)
   */
  static getFullDayAbsenceData(status: DayStatus, notes: string = ''): DayData {
    return {
      timeInterval: '',
      hours: 0,
      status: status,
      notes: notes
    }
  }
}