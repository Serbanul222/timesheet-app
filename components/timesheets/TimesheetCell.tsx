'use client'

import { useState, useRef, useEffect } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { type DayStatus } from '@/types/timesheet-grid'

interface DayData {
  hours: number
  status: DayStatus
  notes: string
}

interface TimesheetCellProps {
  employeeId: string
  date: string
  dayData: DayData
  isWeekend: boolean
  isSelected: boolean
  readOnly: boolean
  onSelect: () => void
  onUpdate: (field: 'hours' | 'status' | 'notes', value: number | DayStatus | string) => void
}

export function TimesheetCell({
  employeeId,
  date,
  dayData,
  isWeekend,
  isSelected,
  readOnly,
  onSelect,
  onUpdate
}: TimesheetCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editMode, setEditMode] = useState<'hours' | 'status' | 'notes'>('hours')
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)

  // Start editing when cell is double-clicked
  const handleDoubleClick = () => {
    if (readOnly) return
    
    setEditMode('hours')
    setEditValue(dayData.hours.toString())
    setIsEditing(true)
    onSelect()
  }

  // Handle status click (single click to cycle through statuses)
  const handleStatusClick = (e: React.MouseEvent) => {
    if (readOnly) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const statusCycle: DayStatus[] = ['off', 'CO', 'CM', 'dispensa']
    const currentIndex = statusCycle.indexOf(dayData.status)
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length]
    
    onUpdate('status', nextStatus)
    onSelect()
  }

  // Save edit
  const saveEdit = () => {
    if (editMode === 'hours') {
      const numValue = parseFloat(editValue) || 0
      if (numValue >= 0 && numValue <= 24) {
        onUpdate('hours', numValue)
      }
    }
    setIsEditing(false)
  }

  // Cancel edit
  const cancelEdit = () => {
    setIsEditing(false)
    setEditValue('')
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Get cell background color based on status
  const getCellBgColor = () => {
    if (isSelected) return 'bg-blue-100 border-blue-400'
    if (isWeekend) return 'bg-gray-50'
    
    switch (dayData.status) {
      case 'CO': return 'bg-red-50'
      case 'CM': return 'bg-yellow-50'
      case 'dispensa': return 'bg-purple-50'
      default: return 'bg-white'
    }
  }

  return (
    <div
      className={`w-12 border-r border-gray-300 cursor-pointer transition-colors relative flex flex-col flex-shrink-0 ${getCellBgColor()} ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      }`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      style={{ minHeight: '56px' }}
    >
      {/* Hours Display/Edit - Top half */}
      <div className="flex-1 flex items-center justify-center min-h-[28px]">
        {isEditing && editMode === 'hours' ? (
          <input
            ref={inputRef}
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="w-10 h-6 text-xs text-center border rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          />
        ) : (
          <div className="text-xs font-medium text-gray-900">
            {dayData.hours > 0 ? `${dayData.hours}h` : ''}
          </div>
        )}
      </div>

      {/* Status Display - Bottom half */}
      <div className="flex-1 flex items-center justify-center min-h-[28px]">
        <div onClick={handleStatusClick} className="cursor-pointer">
          <StatusBadge status={dayData.status} size="xs" />
        </div>
      </div>

      {/* Notes Indicator */}
      {dayData.notes && (
        <div className="absolute top-1 right-1">
          <div 
            className="w-1.5 h-1.5 bg-blue-400 rounded-full"
            title={dayData.notes}
          />
        </div>
      )}
    </div>
  )
}