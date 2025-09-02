// components/timesheets/TimesheetCreator.tsx - Fixed duplication check
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmployeeSelector } from '@/components/employees/EmployeeSelector'
import { validateTimesheetPeriod, getDefaultPeriod } from '@/lib/timesheet-utils'
import { useEmployees } from '@/hooks/data/useEmployees'
import { useAuth } from '@/hooks/auth/useAuth'
import { supabase } from '@/lib/supabase/client'
import { TimesheetDuplicationRules, type DuplicationCheckResult } from '@/lib/validation/timesheetDuplicationRules'
import { DuplicationModal } from './DuplicationModal'
import { formatDateForInput } from '@/lib/utils/dateFormatting'
import { toast } from 'sonner'

const timesheetCreatorSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  storeId: z.string().min(1, 'Store is required'),
  employeeIds: z.array(z.string()).min(1, 'Cel puțin un angajat trebuie să fie selectat')
}).refine((data) => {
  const start = new Date(data.startDate)
  const end = new Date(data.endDate)
  const error = validateTimesheetPeriod(start, end)
  return !error
}, {
  message: 'Invalid timesheet period',
  path: ['endDate']
})

type TimesheetCreatorData = z.infer<typeof timesheetCreatorSchema>

interface Store {
  id: string
  name: string
  zone_id: string
}

interface TimesheetCreatorProps {
  onCreateTimesheet: (data: {
    startDate: Date
    endDate: Date
    storeId: string
    employees: Array<{ id: string; name: string; position?: string }>
    forceDuplicateCreation?: boolean // Add this flag
  }) => void
  onEditExistingTimesheet?: (timesheetId: string) => void
  onCancel: () => void
  className?: string
}

export function TimesheetCreator({
  onCreateTimesheet,
  onEditExistingTimesheet,
  onCancel,
  className = ''
}: TimesheetCreatorProps) {
  const { profile } = useAuth()
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  
  // Duplication check state
  const [duplicationResult, setDuplicationResult] = useState<DuplicationCheckResult | null>(null)
  const [showDuplicationModal, setShowDuplicationModal] = useState(false)
  const [isCheckingDuplication, setIsCheckingDuplication] = useState(false)

  const defaultPeriod = getDefaultPeriod()
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm<TimesheetCreatorData>({
    resolver: zodResolver(timesheetCreatorSchema),
    defaultValues: {
      startDate: defaultPeriod.startDate.toISOString().split('T')[0],
      endDate: defaultPeriod.endDate.toISOString().split('T')[0],
      storeId: '',
      employeeIds: []
    }
  })

  const { employees, isLoading: loadingEmployees } = useEmployees({
    storeId: watch('storeId')
  })

  const watchStartDate = watch('startDate')
  const watchStoreId = watch('storeId')

  // Fetch stores on component mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        let query = supabase
          .from('stores')
          .select('id, name, zone_id')
          .order('name')

        if (profile?.role === 'STORE_MANAGER' && profile.store_id) {
          query = query.eq('id', profile.store_id)
        } else if (profile?.role === 'ASM' && profile.zone_id) {
          query = query.eq('zone_id', profile.zone_id)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching stores:', error)
        } else {
          setStores(data || [])
          if (profile?.role === 'STORE_MANAGER' && profile.store_id && data?.length === 1) {
            setValue('storeId', profile.store_id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setLoadingStores(false)
      }
    }

    if (profile) {
      fetchStores()
    }
  }, [profile, setValue])

  // Auto-update end date when start date changes
  const handleStartDateChange = (startDate: string) => {
    if (startDate) {
      const start = new Date(startDate)
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      setValue('endDate', monthEnd.toISOString().split('T')[0])
    }
  }

  // Handle employee selection
  const handleEmployeeSelection = (employeeIds: string[]) => {
    setSelectedEmployeeIds(employeeIds)
    setValue('employeeIds', employeeIds)
  }

  // FIXED: Enhanced duplication check with better logging
  const checkForDuplicates = async (data: TimesheetCreatorData): Promise<boolean> => {
    console.log('🔍 Creator: checkForDuplicates called with data:', {
      storeId: data.storeId,
      startDate: data.startDate,
      endDate: data.endDate,
      employeeIds: data.employeeIds,
      employeeCount: data.employeeIds.length
    });

    if (!data.storeId || !data.employeeIds.length) {
      console.log('❌ Creator: Missing storeId or employees, skipping duplication check');
      return false
    }

    setIsCheckingDuplication(true)
    
    try {
      // Get selected employee details
      const selectedEmployees = employees.filter(emp => data.employeeIds.includes(emp.id))
      console.log('🔍 Creator: Selected employees:', selectedEmployees.map(e => e.full_name));
      
      const duplicateCheck = await TimesheetDuplicationRules.checkForDuplicate(
        data.storeId,
        data.startDate,
        data.endDate,
        selectedEmployees.map(emp => ({
          employeeId: emp.id,
          employeeName: emp.full_name,
          position: emp.position || 'Staff',
          days: {} // Not needed for duplication check
        }))
      )

      console.log('🔍 Creator: Duplication check result:', duplicateCheck);

      if (duplicateCheck.hasDuplicate) {
        console.log('❌ Creator: Duplicate found, showing modal');
        setDuplicationResult(duplicateCheck)
        setShowDuplicationModal(true)
        return true
      }

      console.log('✅ Creator: No duplicates found');
      return false
    } catch (error) {
      console.error('❌ Creator: Duplication check failed:', error)
      toast.error('Nu s-a putut verifica existența pontajelor duplicate')
      return false
    } finally {
      setIsCheckingDuplication(false)
    }
  }

  // UPDATED: Form submission with proper duplicate checking
  const onSubmit = async (data: TimesheetCreatorData) => {
    console.log('🔍 Creator: onSubmit called with data:', data);
    console.log('🔍 Creator: Form submitted, starting duplication check');
    
    try {
      // CRITICAL: Check for duplicates BEFORE proceeding
      console.log('🔍 Creator: About to call checkForDuplicates');
      const hasDuplicates = await checkForDuplicates(data)
      console.log('🔍 Creator: checkForDuplicates returned:', hasDuplicates);
      
      if (hasDuplicates) {
        console.log('❌ Creator: Duplicates found, stopping submission');
        return // Stop here - modal will handle next steps
      }

      console.log('✅ Creator: No duplicates, proceeding with creation');
      
      // Original submission logic
      const selectedEmployees = employees.filter(emp => 
        data.employeeIds.includes(emp.id)
      ).map(emp => ({
        id: emp.id,
        name: emp.full_name,
        position: emp.position || 'Staff'
      }))

      console.log('🔍 Creator: Calling onCreateTimesheet with employees:', selectedEmployees.length);

      onCreateTimesheet({
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        storeId: data.storeId,
        employees: selectedEmployees,
        forceDuplicateCreation: false // Normal creation
      })
    } catch (error) {
      console.error('❌ Creator: Error in onSubmit:', error);
    }
  }

  // Handle duplication modal actions
  const handleEditExisting = () => {
    console.log('🔍 Creator: handleEditExisting called');
    console.log('🔍 Creator: duplicationResult:', duplicationResult);
    console.log('🔍 Creator: onEditExistingTimesheet function:', typeof onEditExistingTimesheet);
    
    if (duplicationResult?.existingTimesheet) {
      const timesheetId = duplicationResult.existingTimesheet.id;
      console.log('🔍 Creator: Attempting to edit timesheet ID:', timesheetId);
      
      if (onEditExistingTimesheet && typeof onEditExistingTimesheet === 'function') {
        console.log('✅ Creator: Calling onEditExistingTimesheet');
        onEditExistingTimesheet(timesheetId);
      } else {
        console.error('❌ Creator: onEditExistingTimesheet not available');
        toast.error('Nu se poate naviga la pontajul existent');
      }
    } else {
      console.error('❌ Creator: No existing timesheet in result');
    }
    
    setShowDuplicationModal(false)
    setDuplicationResult(null)
  }

  const handleCreateDifferent = () => {
    console.log('🔍 Creator: User chose to create different timesheet');
    setShowDuplicationModal(false)
    setDuplicationResult(null)
    toast.info('Alegeți o altă perioadă sau magazin pentru a crea pontajul')
  }

  const handleForceCreate = async () => {
    console.log('🔍 Creator: User chose to force creation');
    setShowDuplicationModal(false)
    
    const data = getValues()
    const selectedEmployees = employees.filter(emp => 
      data.employeeIds.includes(emp.id)
    ).map(emp => ({
      id: emp.id,
      name: emp.full_name,
      position: emp.position || 'Staff'
    }))

    toast.warning('Se forțează crearea pontajului...')
    onCreateTimesheet({
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      storeId: data.storeId,
      employees: selectedEmployees,
      forceDuplicateCreation: true // Force creation flag
    })
    
    setDuplicationResult(null)
  }

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Crează un nou pontaj</h2>
          <p className="text-sm text-gray-600 mt-1">
            Selectează perioada și angajații pentru a crea un nou pontaj cu intervale de timp și urmărirea stării
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Period Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data de început *"
              type="date"
              {...register('startDate')}
              onChange={(e) => {
                register('startDate').onChange(e)
                handleStartDateChange(e.target.value)
              }}
              error={errors.startDate?.message}
            />
            
            <Input
              label="Data de încheiere *"
              type="date"
              {...register('endDate')}
              error={errors.endDate?.message}
              helperText="Maximum 31 days period"
            />
          </div>

          {/* Store Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Magazin *
            </label>
            {loadingStores ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
            ) : (
              <select
                {...register('storeId')}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${
                  errors.storeId ? 'border-red-500 ring-1 ring-red-500' : ''
                }`}
                disabled={profile?.role === 'STORE_MANAGER' && stores.length === 1}
              >
                <option value="">Selectează un magazin...</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            )}
            {errors.storeId && (
              <p className="mt-1 text-sm text-red-600">{errors.storeId.message}</p>
            )}
          </div>

          {/* Employee Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">
              Selectează angajații *
            </label>
            
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Se încarcă angajații...</span>
              </div>
            ) : (
              <EmployeeSelector
                employees={employees}
                selectedIds={selectedEmployeeIds}
                onSelectionChange={handleEmployeeSelection}
                maxHeight="200px"
              />
            )}
            
            {errors.employeeIds && (
              <p className="text-sm text-red-600">{errors.employeeIds.message}</p>
            )}
            
            {selectedEmployeeIds.length > 0 && (
              <div className="text-sm text-gray-600">
                {selectedEmployeeIds.length} angajat{selectedEmployeeIds.length !== 1 ? 's' : ''} selectat
              </div>
            )}
          </div>

          {/* Feature Preview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">✨ Enhanced Grid Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-700">
              <div>
                <p><strong>Intervale de timp:</strong> Introduceți "10-12" sau "9:30-17:30"</p>
                <p><strong>Auto-calculare:</strong> Orele sunt calculate automat</p>
              </div>
              <div>
                <p><strong>Urmărire status:</strong> CO, CM, asistență pentru dispensă</p>
                <p><strong>Comentarii:</strong> Adăugați note în orice celulă</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {watchStartDate && selectedEmployeeIds.length > 0 && watchStoreId && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">📊 Rezumat pontaj</h4>
              <div className="text-sm text-green-700 space-y-1">
                <p><strong>Perioadă:</strong> {new Date(watchStartDate).toLocaleDateString()} - {watch('endDate') ? new Date(watch('endDate')).toLocaleDateString() : '...'}</p>
                <p><strong>Angajați:</strong> {selectedEmployeeIds.length} selectați</p>
                <p><strong>Magazin:</strong> {stores.find(s => s.id === watchStoreId)?.name || 'Magazin selectat'}</p>
                <p><strong>Zile:</strong> {watchStartDate && watch('endDate') ? 
                  Math.ceil((new Date(watch('endDate')).getTime() - new Date(watchStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0} zile
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || isCheckingDuplication}
            >
              Anulează
            </Button>
            
            <Button
              type="submit"
              loading={isSubmitting || isCheckingDuplication}
              disabled={isSubmitting || isCheckingDuplication || selectedEmployeeIds.length === 0 || !watchStoreId}
            >
              {isCheckingDuplication ? 'Verificare duplicat...' : isSubmitting ? 'Se creează...' : 'Crează Pontaj'}
            </Button>
          </div>
        </form>
      </div>

      {/* Duplication Modal */}
      {duplicationResult && (
        <DuplicationModal
          isOpen={showDuplicationModal}
          onClose={() => {
            console.log('🔍 Creator: Modal closed');
            setShowDuplicationModal(false)
            setDuplicationResult(null)
          }}
          existingTimesheet={duplicationResult.existingTimesheet || null}
          conflictType={duplicationResult.conflictType || null}
          newTimesheetInfo={{
            startDate: getValues('startDate'),
            endDate: getValues('endDate'),
            storeName: stores.find(s => s.id === getValues('storeId'))?.name || 'Magazin selectat',
            employeeCount: selectedEmployeeIds.length
          }}
          onEditExisting={handleEditExisting}
          onCreateDifferent={handleCreateDifferent}
          onForceCreate={handleForceCreate}
          showForceOption={true}
        />
      )}
    </>
  )
}