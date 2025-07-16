// hooks/validation/useAbsenceTypes.ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { AbsenceTypesService, type AbsenceType } from '@/lib/services/absenceTypesService'

/**
 * Hook to fetch and manage absence types
 */
export function useAbsenceTypes() {
  const {
    data: absenceTypes = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['absence-types'],
    queryFn: AbsenceTypesService.getActiveAbsenceTypes,
    staleTime: 1000 * 60 * 30, // 30 minutes - absence types don't change often
    retry: 2
  })

  /**
   * Get absence type by code
   */
  const getAbsenceTypeByCode = (code: string): AbsenceType | undefined => {
    return absenceTypes.find(type => type.code === code)
  }

  /**
   * Check if status allows partial hours
   */
  const isPartialHoursAllowed = (statusCode: string): boolean => {
    return AbsenceTypesService.isPartialHoursAllowed(absenceTypes, statusCode)
  }

  /**
   * Get color class for status
   */
  const getColorClass = (statusCode: string): string => {
    return AbsenceTypesService.getAbsenceTypeColorClass(absenceTypes, statusCode)
  }

  /**
   * Get display name for status
   */
  const getDisplayName = (statusCode: string): string => {
    return AbsenceTypesService.getAbsenceTypeName(absenceTypes, statusCode)
  }

  /**
   * Get all absence codes for validation
   */
  const getAbsenceCodes = (): string[] => {
    return absenceTypes.map(type => type.code)
  }

  /**
   * Check if a status code is a valid absence (not 'alege')
   */
  const isValidAbsence = (statusCode: string): boolean => {
    return statusCode !== 'alege' && absenceTypes.some(type => type.code === statusCode)
  }

  /**
   * Get absence types that allow partial hours
   */
  const getPartialHoursAbsences = (): AbsenceType[] => {
    return absenceTypes.filter(type => type.requires_hours)
  }

  /**
   * Get absence types that are full-day only
   */
  const getFullDayAbsences = (): AbsenceType[] => {
    return absenceTypes.filter(type => !type.requires_hours)
  }

  return {
    absenceTypes,
    isLoading,
    error,
    refetch,
    
    // Helper functions
    getAbsenceTypeByCode,
    isPartialHoursAllowed,
    getColorClass,
    getDisplayName,
    getAbsenceCodes,
    isValidAbsence,
    getPartialHoursAbsences,
    getFullDayAbsences
  }
}