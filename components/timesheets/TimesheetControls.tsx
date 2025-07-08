'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmployeeSelector } from '@/components/employees/EmployeeSelector'
import { EmployeeQuickAdd } from '@/components/employees/EmployeeQuickAdd'
import { useEmployees } from '@/hooks/data/useEmployees'
import { useAuth } from '@/hooks/auth/useAuth'
import { supabase } from '@/lib/supabase/client'
import { type TimesheetGridData } from '@/types/timesheet-grid'
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
  const [selectedStoreId, setSelectedStoreId] = useState(timesheetData.storeId || '')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    timesheetData.entries.map(entry => entry.employeeId)
  )
  const [showAddEmployee, setShowAddEmployee] = useState(false)

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      if (!profile) return

      try {
        let query = supabase
          .from('stores')
          .select('id, name, zone_id')
          .order('name')

        // Apply role-based filtering
        if (profile.role === 'STORE_MANAGER' && profile.store_id) {
          query = query.eq('id', profile.store_id)
        } else if (profile.role === 'ASM' && profile.zone_id) {
          query = query.eq('zone_id', profile.zone_id)
        }

        const { data, error } = await query

        if (!error && data) {
          setStores(data)
          
          // Auto-select store for Store Managers
          if (profile.role === 'STORE_MANAGER' && profile.store_id && data.length === 1) {
            setSelectedStoreId(profile.store_id)
            onUpdate({ storeId: profile.store_id })
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setLoadingStores(false)
      }
    }

    fetchStores()
  }, [profile, onUpdate])

  // Handle period change
  const handlePeriodChange = (field: 'startDate' | 'endDate', value: string) => {
    const updates: Partial<TimesheetGridData> = {
      [field]: new Date(value).toISOString()
    }

    // Auto-adjust end date when start date changes
    if (field === 'startDate') {
      const start = new Date(value)
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      updates.endDate = monthEnd.toISOString()
    }

    onUpdate(updates)
  }

  // Handle store change
  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId)
    onUpdate({ storeId })
  }

  // Handle employee selection
  const handleEmployeeSelection = (employeeIds: string[]) => {
    console.log('Employee selection changed:', employeeIds)
    setSelectedEmployeeIds(employeeIds)
    
    // Create new entries for selected employees
    const selectedEmployees = employees.filter(emp => employeeIds.includes(emp.id))
    console.log('Selected employees:', selectedEmployees)
    
    const dateRange = generateDateRange(
      new Date(timesheetData.startDate),
      new Date(timesheetData.endDate)
    )

    const newEntries = selectedEmployees.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.full_name,
      position: emp.position || 'Staff',
      days: dateRange.reduce((acc, date) => {
        const dateKey = date.toISOString().split('T')[0]
        // Keep existing data if employee was already in the grid
        const existingEntry = timesheetData.entries.find(e => e.employeeId === emp.id)
        acc[dateKey] = existingEntry?.days[dateKey] || {
          startTime: '',
          endTime: '',
          hours: 0,
          status: 'off' as const,
          notes: ''
        }
        return acc
      }, {} as Record<string, { startTime?: string; endTime?: string; hours: number; status: 'off' | 'CO' | 'CM' | 'dispensa'; notes: string }>)
    }))

    console.log('Created entries:', newEntries)
    onUpdate({ entries: newEntries })
  }

  // Handle new employee added
  const handleEmployeeAdded = async (newEmployee: any) => {
    console.log('New employee added:', newEmployee)
    
    // Create entry for the new employee immediately using the returned data
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
          hours: 0,
          status: 'off' as const,
          notes: ''
        }
        return acc
      }, {} as Record<string, { hours: number; status: 'off' | 'CO' | 'CM' | 'dispensa'; notes: string }>)
    }

    // Add to existing entries
    const updatedEntries = [...timesheetData.entries, newEntry]
    console.log('Adding new entry directly:', newEntry)
    
    // Update the timesheet data with new entry
    onUpdate({ entries: updatedEntries })
    
    // Update selected employee IDs
    const newEmployeeIds = [...selectedEmployeeIds, newEmployee.id]
    setSelectedEmployeeIds(newEmployeeIds)
    
    // Refresh the employees list in background
    refetchEmployees()
    
    // Hide the add form
    setShowAddEmployee(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {/* Period Selection */}
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

          {/* Store Selection */}
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

      {/* Employee Selection */}
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
              onClick={() => {
                console.log('Add Employee button clicked')
                setShowAddEmployee(true)
              }}
              disabled={loadingEmployees}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Employee
            </Button>
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-red-500">
                ShowForm: {showAddEmployee ? 'Yes' : 'No'}
              </span>
            )}
          </div>
        </div>

        {/* Add Employee Form */}
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

      {/* Summary */}
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
                onClick={() => {
                  // Quick action to select all employees
                  const allEmployeeIds = employees.map(emp => emp.id)
                  handleEmployeeSelection(allEmployeeIds)
                }}
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
    </div>
  )
}