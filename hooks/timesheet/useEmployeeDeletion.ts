// FILE: hooks/timesheet/useEmployeeDeletion.ts - WITH DEBUG LOGS
'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { type TimesheetGridData } from '@/types/timesheet-grid'
import { TimesheetDeleteService } from '@/lib/services/timesheetDeleteService'

interface UseEmployeeDeletionProps {
  data: TimesheetGridData | null
  onDataChange: (updates: Partial<TimesheetGridData>) => void
  readOnly?: boolean
}

export function useEmployeeDeletion({
  data,
  onDataChange,
  readOnly = false
}: UseEmployeeDeletionProps) {
  const queryClient = useQueryClient()
 
  const deleteEmployee = useCallback(async (employeeId: string) => {
    // <-- DEBUG LOG 3: Verificăm dacă hook-ul este apelat
    console.log(`[LOG 3 - useEmployeeDeletion] Se încearcă dezactivarea ID: ${employeeId}`);

    if (readOnly || !data) {
      toast.error('Nu se poate șterge angajatul în modul doar citire')
      return { success: false, error: 'Read-only mode' }
    }
    const employeeToDelete = data.entries.find(entry => entry.employeeId === employeeId)
    if (!employeeToDelete) {
      toast.error('Angajatul nu a fost găsit')
      return { success: false, error: 'Employee not found' }
    }
    const hasTimeEntries = Object.values(employeeToDelete.days).some(day => day && (day.hours > 0 || (day.timeInterval && day.timeInterval.trim() !== '') || (day.status && day.status !== 'alege') || (day.notes && day.notes.trim() !== '')))

    try {
      toast.loading('Dezactivare angajat...', { id: 'delete-employee' })
      
      const deleteResult = await TimesheetDeleteService.deactivateEmployee(employeeId)

      if (!deleteResult.success) {
        toast.error(`Eroare la dezactivare: ${deleteResult.error}`, { id: 'delete-employee' })
        return deleteResult
      }

      // <-- DEBUG LOG 4: Confirmăm că dezactivarea a avut succes și invalidăm query-ul
      console.log(`[LOG 4 - useEmployeeDeletion] Dezactivare reușită. Se invalidează query-ul ['employees'].`);
      await queryClient.invalidateQueries({ queryKey: ['employees'] })

      const newEntries = data.entries.filter(entry => entry.employeeId !== employeeId)
      onDataChange({
        entries: newEntries,
        updatedAt: new Date().toISOString()
      })

      toast.success(
        hasTimeEntries 
          ? `${employeeToDelete.employeeName} a fost dezactivat (datele din pontaj au fost păstrate în istoric)`
          : `${employeeToDelete.employeeName} a fost dezactivat`,
        { id: 'delete-employee' }
      )
      
      return deleteResult

    } catch (error) {
      console.error('Delete employee error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Eroare neașteptată la dezactivarea angajatului', { id: 'delete-employee' })
      return { success: false, error: errorMessage }
    }
  }, [data, onDataChange, readOnly, queryClient])

  const deleteBulkEmployees = useCallback(async (employeeIds: string[]) => {
    if (readOnly || !data || employeeIds.length === 0) {
      toast.error('Nu se pot dezactiva angajații în modul doar citire')
      return { success: false, error: 'Read-only or no selection' }
    }
    const employeesToDelete = data.entries.filter(entry => employeeIds.includes(entry.employeeId))
    if (employeesToDelete.length === 0) {
      toast.error('Niciun angajat selectat pentru dezactivare')
      return { success: false, error: 'No matching employees' }
    }

    try {
      toast.loading('Dezactivare angajați...', { id: 'delete-bulk' })
      
      const deleteResult = await TimesheetDeleteService.deactivateBulkEmployees(employeeIds)

      if (!deleteResult.success) {
        toast.error(`Eroare la dezactivare: ${deleteResult.error}`, { id: 'delete-bulk' })
        return deleteResult
      }
      
      await queryClient.invalidateQueries({ queryKey: ['employees'] })

      const newEntries = data.entries.filter(entry => !employeeIds.includes(entry.employeeId))
      onDataChange({
        entries: newEntries,
        updatedAt: new Date().toISOString()
      })

      toast.success(
        `${employeesToDelete.length} angajat${employeesToDelete.length !== 1 ? 'i' : ''} dezactivat${employeesToDelete.length !== 1 ? 'i' : ''} (istoric păstrat)`,
        { id: 'delete-bulk' }
      )
      return deleteResult

    } catch (error) {
      console.error('Delete bulk employees error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Eroare neașteptată la dezactivarea angajaților', { id: 'delete-bulk' })
      return { success: false, error: errorMessage }
    }
  }, [data, onDataChange, readOnly, queryClient])

  return {
    deleteEmployee,
    deleteBulkEmployees,
  }
}