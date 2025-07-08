'use client'

import { useState, useRef, useEffect } from 'react'
import { type DayStatus } from '@/types/timesheet-grid'

interface DayData {
  startTime?: string
  endTime?: string
  timeInterval?: string
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
  onUpdate: (field: 'timeInterval' | 'status' | 'notes', value: string | DayStatus) => void
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
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle double-click for time editing
  const handleDoubleClick = () => {
    if (readOnly) return
    setEditValue(dayData.timeInterval || '')
    setIsEditingTime(true)
    onSelect()
  }

  // Handle right-click for notes
  const handleRightClick = (e: React.MouseEvent) => {
    if (readOnly) return
    e.preventDefault()
    e.stopPropagation()
    setEditValue(dayData.notes || '')
    setIsEditingNotes(true)
    onSelect()
  }

  // Save time edit
  const saveTimeEdit = () => {
    onUpdate('timeInterval', editValue.trim())
    setIsEditingTime(false)
  }

  // Save notes edit
  const saveNotesEdit = () => {
    onUpdate('notes', editValue)
    setIsEditingNotes(false)
  }

  // Cancel edit
  const cancelEdit = () => {
    setIsEditingTime(false)
    setIsEditingNotes(false)
    setEditValue('')
  }

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isEditingTime) saveTimeEdit()
      if (isEditingNotes) saveNotesEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // Focus effects
  useEffect(() => {
    if (isEditingTime && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
    if (isEditingNotes && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditingTime, isEditingNotes])

  // Cell background based on status
  const getCellBg = () => {
    if (isSelected) return 'bg-blue-100 border-blue-400'
    if (isWeekend) return 'bg-gray-50'
    
    switch (dayData.status) {
      case 'CO': return 'bg-red-50'
      case 'CM': return 'bg-yellow-50'
      case 'dispensa': return 'bg-purple-50'
      default: return 'bg-white'
    }
  }
  
  // Helper function to get text color class for the select dropdown
  const getStatusTextColor = () => {
    switch (dayData.status) {
      // ✅ FIX: Changed text color for 'alege' to be more prominent
      case 'alege': return 'text-blue-700';
      case 'CO': return 'text-red-600 font-semibold';
      case 'CM': return 'text-amber-600 font-semibold';
      case 'dispensa': return 'text-purple-600 font-semibold';
      case 'off': return 'text-gray-700';
      default: return 'text-gray-700';
    }
  }

  const hasNotes = dayData.notes && dayData.notes.trim()
  const hasTime = dayData.timeInterval && dayData.timeInterval.trim()

  return (
    <div
      className={`w-12 border-r border-gray-300 cursor-pointer relative flex flex-col ${getCellBg()} ${
        isSelected ? 'ring-2 ring-blue-400' : ''
      }`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      style={{ minHeight: '44px' }}
    >
      {/* Time Section */}
      <div className="flex-1 flex items-center justify-center px-1">
        {isEditingTime ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveTimeEdit}
            onKeyDown={handleKeyDown}
            className="w-full h-4 text-xs text-center border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="10-12"
          />
        ) : (
          <div className="text-center">
            {hasTime && (
              <div className="text-xs font-medium text-gray-900">
                {dayData.timeInterval}
              </div>
            )}
            {dayData.hours > 0 && (
              <div className="text-xs font-bold text-blue-600">
                ({dayData.hours}h)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Dropdown Section */}
      <div className="flex items-center justify-center pb-1 relative">
        {!readOnly ? (
          <>
            <select
              value={dayData.status}
              onChange={(e) => {
                onUpdate('status', e.target.value as DayStatus)
                onSelect()
              }}
              onClick={(e) => e.stopPropagation()}
              // ✅ FIX: Applied more prominent button styles for 'alege' status
              className={`text-xs cursor-pointer focus:outline-none w-full text-center appearance-none px-1 py-0 transition-colors ${
                dayData.status === 'alege'
                  ? 'bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 shadow-sm font-semibold'
                  : 'bg-transparent border-0'
              } ${getStatusTextColor()}`}
            >
              <option value="alege">Alege</option>
              <option value="off">Off</option>
              <option value="CO">CO</option>
              <option value="CM">CM</option>
              <option value="dispensa">D</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>
          </>
        ) : (
          <span className="text-xs text-gray-600">
            {dayData.status === 'off' ? 'Off' : dayData.status}
          </span>
        )}
      </div>

      {/* Notes Indicator */}
      {hasNotes && (
        <div 
          className="absolute top-1 right-1 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation()
            handleRightClick(e as any)
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full hover:bg-orange-500" />
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute top-2 right-0 z-50 bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg max-w-32 whitespace-pre-wrap">
              {dayData.notes}
            </div>
          )}
        </div>
      )}

      {/* Notes Edit Popup */}
      {isEditingNotes && (
        <div className="absolute top-full left-0 z-50 bg-white border rounded shadow-lg p-2 w-36">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-16 text-xs border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Add note..."
          />
          <div className="flex justify-end space-x-1 mt-1">
            <button
              onClick={cancelEdit}
              className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={saveNotesEdit}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
