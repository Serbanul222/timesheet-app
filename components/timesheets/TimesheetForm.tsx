'use client'

import { useEffect } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { useTimesheets, TimesheetWithDetails } from '@/hooks/data/useTimesheets'
import { useEmployees } from '@/hooks/data/useEmployees'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { eachDayOfInterval, format, startOfMonth, endOfMonth, getDay } from 'date-fns'
import { DailyEntry } from '@/types/database'

interface TimesheetFormProps {
  month: Date
  employeeId: string
  existingTimesheet?: TimesheetWithDetails
  onSuccess?: () => void
  onCancel?: () => void
}

export function TimesheetForm({ month, employeeId, existingTimesheet, onSuccess, onCancel }: TimesheetFormProps) {
  const { upsertTimesheet, isUpserting } = useTimesheets()
  const { employees } = useEmployees()
  const employee = employees.find(e => e.id === employeeId)

  const { control, handleSubmit } = useForm({
    defaultValues: {
      daily_entries: [] as DailyEntry[]
    }
  });

  const { fields, replace } = useFieldArray({
    control,
    name: "daily_entries"
  });

  useEffect(() => {
    const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
    const existingEntries = new Map((existingTimesheet?.daily_entries || []).map(e => [format(new Date(e.date), 'yyyy-MM-dd'), e]));
    
    const newEntries = daysInMonth.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const existing = existingEntries.get(dateStr);
      return {
        date: dateStr,
        status: existing?.status || 'work',
        hours: existing?.hours || '',
      };
    });
    replace(newEntries);
  }, [month, existingTimesheet, replace]);

  const onSubmit = (data: { daily_entries: DailyEntry[] }) => {
    upsertTimesheet({
      timesheet: existingTimesheet,
      employeeId,
      month,
      daily_entries: data.daily_entries
    }, {
      onSuccess: onSuccess
    });
  };

  if (!employee) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Error</h2>
        <p className="text-gray-700 mt-2">Could not find the selected employee. Please close this and try again.</p>
        <Button variant="outline" className="mt-4" onClick={onCancel}>Close</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{employee.full_name}</h2>
          <p className="text-gray-600">Editing timesheet for <span className="font-semibold">{format(month, 'MMMM yyyy')}</span></p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {fields.map((field, index) => {
            const day = new Date(field.date);
            const isWeekend = [0, 6].includes(getDay(day));
            return (
              <div key={field.id} className={`p-3 rounded-md border ${isWeekend ? 'bg-gray-100' : 'bg-white'}`}>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {format(day, 'EEE, d')}
                </label>
                <Controller
                  name={`daily_entries.${index}.status`}
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="w-full mb-2 p-1 border-gray-300 rounded-md text-sm">
                      <option value="work">Work</option>
                      <option value="off">Off</option>
                      <option value="CO">CO</option>
                      <option value="other">Other</option>
                    </select>
                  )}
                />
                <Controller
                  name={`daily_entries.${index}.hours`}
                  control={control}
                  render={({ field: inputField }) => (
                    <Input {...inputField} placeholder="e.g. 10-18" />
                  )}
                />
              </div>
            )
          })}
        </div>
        
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={isUpserting}>
            Save Timesheet
          </Button>
        </div>
      </form>
    </div>
  )
}