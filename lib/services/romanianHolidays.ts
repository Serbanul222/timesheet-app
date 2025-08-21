// lib/services/romanianHolidays.ts
import { formatDateForDB } from '@/lib/timesheet-utils'

export interface RomanianHoliday {
  date: string // YYYY-MM-DD format
  name: string
  localName: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[] | null
  launchYear: number | null
  types: string[]
}

export interface HolidaysCache {
  [year: number]: RomanianHoliday[]
}

class RomanianHolidaysService {
  private cache: HolidaysCache = {}
  private readonly BASE_URL = 'https://date.nager.at/api/v3/PublicHolidays'

  /**
   * Fetch holidays for a specific year with caching
   */
  async getHolidays(year: number): Promise<RomanianHoliday[]> {
    // Return from cache if available
    if (this.cache[year]) {
      return this.cache[year]
    }

    try {
      const response = await fetch(`${this.BASE_URL}/${year}/RO`)
      
      if (!response.ok) {
        console.warn(`Failed to fetch holidays for ${year}: ${response.status}`)
        return []
      }

      const holidays: RomanianHoliday[] = await response.json()
      
      // Cache the results
      this.cache[year] = holidays
      
      console.log(`Loaded ${holidays.length} Romanian holidays for ${year}`)
      return holidays

    } catch (error) {
      console.error(`Error fetching Romanian holidays for ${year}:`, error)
      return []
    }
  }

  /**
   * Check if a specific date is a Romanian public holiday
   */
  async isHoliday(date: Date | string): Promise<boolean> {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const year = dateObj.getFullYear()
    const dateKey = formatDateForDB(dateObj)

    const holidays = await this.getHolidays(year)
    return holidays.some(holiday => holiday.date === dateKey)
  }

  /**
   * Get holiday info for a specific date
   */
  async getHolidayInfo(date: Date | string): Promise<RomanianHoliday | null> {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const year = dateObj.getFullYear()
    const dateKey = formatDateForDB(dateObj)

    const holidays = await this.getHolidays(year)
    return holidays.find(holiday => holiday.date === dateKey) || null
  }

  /**
   * Get holidays for a date range (useful for timesheet periods)
   */
  async getHolidaysInRange(startDate: Date | string, endDate: Date | string): Promise<Map<string, RomanianHoliday>> {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate
    
    const holidayMap = new Map<string, RomanianHoliday>()
    
    // Get unique years in the range
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    const years = []
    
    for (let year = startYear; year <= endYear; year++) {
      years.push(year)
    }

    // Fetch holidays for all years in range
    const allHolidaysPromises = years.map(year => this.getHolidays(year))
    const allHolidaysArrays = await Promise.all(allHolidaysPromises)
    
    // Flatten and filter holidays within the date range
    const allHolidays = allHolidaysArrays.flat()
    
    allHolidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date)
      if (holidayDate >= start && holidayDate <= end) {
        holidayMap.set(holiday.date, holiday)
      }
    })

    return holidayMap
  }

  /**
   * Preload holidays for a specific year (useful for performance)
   */
  async preloadYear(year: number): Promise<void> {
    if (!this.cache[year]) {
      await this.getHolidays(year)
    }
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache = {}
  }

  /**
   * Get cached years
   */
  getCachedYears(): number[] {
    return Object.keys(this.cache).map(Number)
  }
}

// Export singleton instance
export const romanianHolidaysService = new RomanianHolidaysService()

// Hook for React components
import { useState, useEffect } from 'react'

export function useRomanianHolidays(startDate?: Date | string, endDate?: Date | string) {
  const [holidays, setHolidays] = useState<Map<string, RomanianHoliday>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!startDate || !endDate) {
      setHolidays(new Map())
      return
    }

    const loadHolidays = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const holidayMap = await romanianHolidaysService.getHolidaysInRange(startDate, endDate)
        setHolidays(holidayMap)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load holidays')
        console.error('Error loading Romanian holidays:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadHolidays()
  }, [startDate, endDate])

  return {
    holidays,
    isLoading,
    error,
    isHoliday: (date: string) => holidays.has(date),
    getHoliday: (date: string) => holidays.get(date) || null
  }
}