'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmployeeSelector } from '@/components/employees/EmployeeSelector'
import { EmployeeQuickAdd } from '@/components/employees/EmployeeQuickAdd'
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
}

export function TimesheetControls({
  timesheetData,
  onUpdate,
  isSaving
}: TimesheetControlsProps) {
  const { profile } = useAuth()
  const { employees, isLoading: loadingEmployees, refetch: refetchEmployees } = useEmployees()
  
  const [stores, setStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [showAddEmployee, setShowAddEmployee] = useState(false)

  const [selectedStoreId, setSelectedStoreId] = useState(timesheetData.storeId || '')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    timesheetData.entries.map(entry => entry.employeeId)
  )

  useEffect(() => {
    setSelectedStoreId(timesheetData.storeId || '')
  }, [timesheetData.storeId])

  useEffect(() => {
    const currentIds = timesheetData.entries.map(entry => entry.employeeId)
    if (JSON.stringify(currentIds) !== JSON.stringify(selectedEmployeeIds)) {
      setSelectedEmployeeIds(currentIds)
    }
  }, [timesheetData.entries, selectedEmployeeIds])

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
        if (error) throw error;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])


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
    setSelectedStoreId(storeId)
    onUpdate({ storeId: storeId, entries: [] })
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
          // ✅ FIX: Default status is now 'alege'
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
          // ✅ FIX: Default status is now 'alege'
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
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Period & Setup</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Store
            </label>
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
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-900">
            Select Employees
          </label>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddEmployee(true)}
              disabled={loadingEmployees}
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
        
        {loadingEmployees ? (
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
          />
        )}
      </div>

      {selectedEmployeeIds.length > 0 && selectedStoreId && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-800">Timesheet Summary</h4>
              <div className="text-sm text-blue-700 mt-1">
                <span className="font-medium">{selectedEmployeeIds.length}</span> employees • 
                <span className="font-medium ml-1">
                  {new Date(timesheetData.startDate).toLocaleDateString()} - {new Date(timesheetData.endDate).toLocaleDateString()}
                </span> • 
                <span className="font-medium ml-1">
                  {stores.find(s => s.id === selectedStoreId)?.name || 'Store selected'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEmployeeSelection(employees.map(emp => emp.id))}
                disabled={loadingEmployees}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEmployeeSelection([])}
                disabled={selectedEmployeeIds.length === 0}
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">How to Use the Grid</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• <strong>Time Intervals:</strong> Double-click cells and enter time like "10-12" or "9:30-17:30" - hours calculate automatically</p>
          <p>• <strong>Status Changes:</strong> Click status badges to cycle: Off → CO (Vacation) → CM (Medical) → D (Dispensation)</p>
          <p>• <strong>Comments:</strong> Right-click any cell to add notes - orange dots show cells with comments</p>
          <p>• <strong>Navigation:</strong> Use Tab/Enter to move between cells, Esc to cancel editing</p>
        </div>
      </div>
    </div>
  )
}
