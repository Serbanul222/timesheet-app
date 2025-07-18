// components/timesheets/TimesheetControls.tsx - Updated with historical context
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmployeeSelector } from '@/components/employees/EmployeeSelector'
import { EmployeeQuickAddWithLookup as EmployeeQuickAdd } from '@/components/employees/EmployeeQuickAddWithLookup'
import { EmployeeDelegationPanel } from './EmployeeDelegationPanel'
import { DelegationInfoPanel } from './DelegationInfoPanel'
import { TimesheetSummaryPanel } from './TimesheetSummaryPanel'
import { useEmployees } from '@/hooks/data/useEmployees'
import { useAuth } from '@/hooks/auth/useAuth'
import { supabase } from '@/lib/supabase/client'
import { type TimesheetGridData, type DayStatus } from '@/types/timesheet-grid'
import { generateDateRange } from '@/lib/timesheet-utils'

interface Store {
  id: string
  name: string
  zone_id: string
}

interface TimesheetControlsProps {
  timesheetData: TimesheetGridData
  onUpdate: (data: Partial<TimesheetGridData>) => void
  isSaving: boolean
  // ✅ NEW: Pass existing timesheet ID for historical context
  existingTimesheetId?: string
}

export function TimesheetControls({
  timesheetData,
  onUpdate,
  isSaving,
  existingTimesheetId // ✅ NEW: Historical context
}: TimesheetControlsProps) {
  const { profile } = useAuth()
  
  // ✅ ENHANCED: Pass timesheet ID for historical employee loading
  const { 
    employees, 
    regularEmployees,
    delegatedEmployees,
    historicalEmployees, // ✅ NEW: Historical employees
    isLoading: loadingEmployees, 
    refetch: refetchEmployees,
    hasStoreSelected 
  } = useEmployees({
    storeId: timesheetData.storeId,
    includeDelegated: true,
    timesheetId: existingTimesheetId // ✅ NEW: Include historical context
  })
  
  const [stores, setStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState(timesheetData.storeId || '')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    timesheetData.entries.map(entry => entry.employeeId)
  )

  // Sync with timesheet data
  useEffect(() => {
    setSelectedStoreId(timesheetData.storeId || '')
  }, [timesheetData.storeId])

  useEffect(() => {
    const currentIds = timesheetData.entries.map(entry => entry.employeeId)
    if (JSON.stringify(currentIds) !== JSON.stringify(selectedEmployeeIds)) {
      setSelectedEmployeeIds(currentIds)
    }
  }, [timesheetData.entries, selectedEmployeeIds])

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      if (!profile) return

      setLoadingStores(true)
      try {
        let query = supabase.from('stores').select('id, name, zone_id').order('name')

        if (profile.role === 'STORE_MANAGER' && profile.store_id) {
          query = query.eq('id', profile.store_id)
        } else if (profile.role === 'ASM' && profile.zone_id) {
          query = query.eq('zone_id', profile.zone_id)
        }

        const { data, error } = await query
        if (error) throw error

        if (data) {
          setStores(data)
          if (profile.role === 'STORE_MANAGER' && profile.store_id && data.length === 1) {
            if (timesheetData.storeId !== profile.store_id) {
              onUpdate({ storeId: profile.store_id })
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setLoadingStores(false)
      }
    }

    fetchStores()
  }, [profile, timesheetData.storeId, onUpdate])

  const handlePeriodChange = (field: 'startDate' | 'endDate', value: string) => {
    const updates: Partial<TimesheetGridData> = {
      [field]: new Date(value).toISOString()
    }
    if (field === 'startDate') {
      const start = new Date(value)
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      updates.endDate = monthEnd.toISOString()
    }
    onUpdate(updates)
  }

  const handleStoreChange = (storeId: string) => {
    const selectedStore = stores.find(store => store.id === storeId)
    setSelectedStoreId(storeId)
    setSelectedEmployeeIds([])
    
    onUpdate({ 
      storeId: storeId, 
      zoneId: selectedStore ? selectedStore.zone_id : undefined,
      entries: [] 
    })
  }

  const handleEmployeeSelection = (employeeIds: string[]) => {
    const selectedEmployees = employees.filter(emp => employeeIds.includes(emp.id))
    
    if (selectedEmployees.length === 0) {
      onUpdate({ entries: [] })
      return
    }
    
    const dateRange = generateDateRange(
      new Date(timesheetData.startDate),
      new Date(timesheetData.endDate)
    )

    const existingDataMap = new Map(
      timesheetData.entries.map(entry => [entry.employeeId, entry.days])
    )

    const newEntries = selectedEmployees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.full_name,
      position: emp.position || 'Staff',
      days: dateRange.reduce((acc, date) => {
        const dateKey = date.toISOString().split('T')[0]
        const existingDays = existingDataMap.get(emp.id)
        
        acc[dateKey] = existingDays?.[dateKey] || {
          timeInterval: '',
          startTime: '',
          endTime: '',
          hours: 0,
          status: 'alege' as DayStatus,
          notes: ''
        }
        return acc
      }, {} as Record<string, any>)
    }))
    
    onUpdate({ 
      entries: newEntries,
      updatedAt: new Date().toISOString()
    })
  }

  const handleEmployeeAdded = (newEmployee: any) => {
    const dateRange = generateDateRange(
      new Date(timesheetData.startDate),
      new Date(timesheetData.endDate)
    )

    const newEntry = {
      employeeId: newEmployee.id,
      employeeName: newEmployee.full_name,
      position: newEmployee.position || 'Staff',
      days: dateRange.reduce((acc, date) => {
        const dateKey = date.toISOString().split('T')[0]
        acc[dateKey] = {
          timeInterval: '',
          startTime: '',
          endTime: '',
          hours: 0,
          status: 'alege' as DayStatus,
          notes: ''
        }
        return acc
      }, {} as Record<string, any>)
    }

    onUpdate({ entries: [...timesheetData.entries, newEntry] })
    refetchEmployees()
    setShowAddEmployee(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {/* Period & Store Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Period & Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={timesheetData.startDate.split('T')[0]}
            onChange={(e) => handlePeriodChange('startDate', e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={timesheetData.endDate.split('T')[0]}
            onChange={(e) => handlePeriodChange('endDate', e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Store *</label>
            {loadingStores ? (
              <div className="animate-pulse h-10 bg-gray-200 rounded-md"></div>
            ) : (
              <select
                value={selectedStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                disabled={profile?.role === 'STORE_MANAGER' && stores.length === 1}
              >
                <option value="">Select store...</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Employee Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-gray-900">Select Employees</label>
            
            {/* ✅ NEW: Show employee type counts */}
            <div className="flex items-center space-x-2 text-xs">
              {historicalEmployees.length > 0 && (
                <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {historicalEmployees.length} from timesheet
                </div>
              )}
              {delegatedEmployees.length > 0 && (
                <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded">
                  {delegatedEmployees.length} delegated here
                </div>
              )}
              {regularEmployees.length > 0 && (
                <div className="text-green-600 bg-green-50 px-2 py-1 rounded">
                  {regularEmployees.length} regular
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddEmployee(true)}
              disabled={loadingEmployees || !selectedStoreId}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </Button>
          </div>
        </div>

        {showAddEmployee && (
          <EmployeeQuickAdd
            onEmployeeAdded={handleEmployeeAdded}
            onCancel={() => setShowAddEmployee(false)}
            preselectedStoreId={selectedStoreId}
          />
        )}

        {/* ✅ NEW: Historical employees notice */}
        {historicalEmployees.length > 0 && existingTimesheetId && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-800">Editing Existing Timesheet</h4>
                <p className="text-sm text-blue-700 mt-1">
                  This timesheet includes employees who may have been delegated to other stores since it was created. 
                  These employees ({historicalEmployees.map(emp => emp.full_name).join(', ')}) are shown with grayed-out 
                  styling but remain editable for this timesheet.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!hasStoreSelected ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-blue-800">
              <svg className="w-8 h-8 mx-auto mb-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-6m-2 0H3" />
              </svg>
              <p className="text-sm font-medium">Select a store above to view employees</p>
              <p className="text-xs mt-1">Employees will be loaded only for the selected store</p>
            </div>
          </div>
        ) : loadingEmployees ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading employees...</span>
          </div>
        ) : (
          <EmployeeSelector
            employees={employees}
            selectedIds={selectedEmployeeIds}
            onSelectionChange={handleEmployeeSelection}
            maxHeight="150px"
            storeId={selectedStoreId}
            historicalEmployees={historicalEmployees} // ✅ NEW: Pass historical context
          />
        )}
      </div>

      {/* Delegation Panel */}
      <EmployeeDelegationPanel
        employees={employees}
        selectedEmployeeIds={selectedEmployeeIds}
        regularEmployees={regularEmployees}
        delegatedEmployees={delegatedEmployees}
      />

      {/* Summary Panel */}
      <TimesheetSummaryPanel
        selectedEmployeeIds={selectedEmployeeIds}
        selectedStoreId={selectedStoreId}
        timesheetData={timesheetData}
        stores={stores}
        regularEmployees={regularEmployees}
        delegatedEmployees={delegatedEmployees}
        historicalEmployees={historicalEmployees} // ✅ NEW: Include historical
        employees={employees}
        onSelectAll={() => handleEmployeeSelection(employees.map(emp => emp.id))}
        onClearAll={() => handleEmployeeSelection([])}
        isLoadingEmployees={loadingEmployees}
      />

      {/* Delegation Info */}
      <DelegationInfoPanel delegatedEmployees={delegatedEmployees} />
    </div>
  )
}