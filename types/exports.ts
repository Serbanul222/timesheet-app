// types/exports.ts
export type ExportFormat = 'excel' | 'csv'

export interface ExportOptions {
  // Date filtering
  dateRange?: {
    startDate: string
    endDate: string
  }
  
  // Store/Zone filtering  
  storeIds?: string[]
  zoneIds?: string[]
  
  // Employee filtering
  employeeIds?: string[]
  includeDelegated?: boolean
  
  // Data options
  includeNotes?: boolean
  includeEmptyDays?: boolean
  groupByStore?: boolean
  groupByEmployee?: boolean
  
  // Format specific options
  maxRows?: number
  sheetNames?: {
    summary?: string
    details?: string
    employees?: string
  }
  
  // File options
  filename?: string
  compression?: boolean
}

export interface ExportResult {
  success: boolean
  data?: {
    buffer: ArrayBuffer
    filename: string
    mimeType: string
    size: number
  }
  error?: string
  timestamp: string
  downloadUrl?: string
}

export interface ProcessedTimesheetData {
  // Summary information
  summary: {
    totalHours: number
    totalEmployees: number
    totalTimesheets: number
    dateRange: {
      start: string
      end: string
    }
    exportedAt: string
    exportedBy?: string
  }
  
  // Timesheet records
  timesheets: Array<{
    id: string
    gridTitle: string
    storeId: string
    storeName: string
    zoneId: string
    zoneName?: string
    periodStart: string
    periodEnd: string
    totalHours: number
    employeeCount: number
    createdAt: string
    updatedAt: string
  }>
  
  // Employee information
  employees: Array<{
    id: string
    name: string
    position: string
    employeeCode?: string
    storeId: string
    storeName: string
    totalHours: number
    daysWorked: number
    isDelegated: boolean
    delegationInfo?: {
      fromStore: string
      toStore: string
      validUntil: string
    }
  }>
  
  // Store information
  stores: Array<{
    id: string
    name: string
    zoneId: string
    zoneName?: string
    employeeCount: number
    totalHours: number
    timesheetCount: number
  }>
  
  // Daily entries (detailed view)
  dailyEntries: Array<{
    timesheetId: string
    employeeId: string
    employeeName: string
    position: string
    storeId: string
    storeName: string
    date: string
    dayOfWeek: string
    timeInterval?: string
    hours: number
    status: string
    statusDescription: string
    notes?: string
    isWeekend: boolean
    isDelegated: boolean
  }>
}

export interface ExportTemplate {
  name: string
  description: string
  format: ExportFormat
  options: ExportOptions
  sheets?: Array<{
    name: string
    type: 'summary' | 'details' | 'employees' | 'stores'
    columns: ExportColumn[]
  }>
}

export interface ExportColumn {
  key: string
  label: string
  type: 'string' | 'number' | 'date' | 'time' | 'currency' | 'percentage'
  width?: number
  format?: string
  alignment?: 'left' | 'center' | 'right'
  backgroundColor?: string
  fontWeight?: 'normal' | 'bold'
}

// Predefined export templates
export const EXPORT_TEMPLATES: Record<string, ExportTemplate> = {
  detailed: {
    name: 'Detailed Report',
    description: 'Complete timesheet data with daily entries',
    format: 'excel',
    options: {
      includeNotes: true,
      includeEmptyDays: false,
      groupByStore: true
    },
    sheets: [
      {
        name: 'Summary',
        type: 'summary',
        columns: [
          { key: 'storeName', label: 'Store', type: 'string', width: 20 },
          { key: 'employeeCount', label: 'Employees', type: 'number', width: 12 },
          { key: 'totalHours', label: 'Total Hours', type: 'number', width: 15 },
          { key: 'timesheetCount', label: 'Timesheets', type: 'number', width: 12 }
        ]
      },
      {
        name: 'Daily Details',
        type: 'details',
        columns: [
          { key: 'storeName', label: 'Store', type: 'string', width: 15 },
          { key: 'employeeName', label: 'Employee', type: 'string', width: 20 },
          { key: 'position', label: 'Position', type: 'string', width: 15 },
          { key: 'date', label: 'Date', type: 'date', width: 12 },
          { key: 'dayOfWeek', label: 'Day', type: 'string', width: 10 },
          { key: 'timeInterval', label: 'Time', type: 'string', width: 12 },
          { key: 'hours', label: 'Hours', type: 'number', width: 10 },
          { key: 'status', label: 'Status', type: 'string', width: 12 },
          { key: 'notes', label: 'Notes', type: 'string', width: 25 }
        ]
      }
    ]
  },
  
  summary: {
    name: 'Summary Report',
    description: 'High-level overview by store and employee',
    format: 'excel',
    options: {
      includeNotes: false,
      includeEmptyDays: false,
      groupByStore: true
    },
    sheets: [
      {
        name: 'Store Summary',
        type: 'stores',
        columns: [
          { key: 'storeName', label: 'Store Name', type: 'string', width: 20 },
          { key: 'zoneName', label: 'Zone', type: 'string', width: 15 },
          { key: 'employeeCount', label: 'Employees', type: 'number', width: 12 },
          { key: 'totalHours', label: 'Total Hours', type: 'number', width: 15 },
          { key: 'timesheetCount', label: 'Timesheets', type: 'number', width: 12 }
        ]
      },
      {
        name: 'Employee Summary',
        type: 'employees',
        columns: [
          { key: 'name', label: 'Employee Name', type: 'string', width: 20 },
          { key: 'position', label: 'Position', type: 'string', width: 15 },
          { key: 'storeName', label: 'Store', type: 'string', width: 15 },
          { key: 'totalHours', label: 'Total Hours', type: 'number', width: 12 },
          { key: 'daysWorked', label: 'Days Worked', type: 'number', width: 12 },
          { key: 'isDelegated', label: 'Delegated', type: 'string', width: 10 }
        ]
      }
    ]
  },
  
  payroll: {
    name: 'Payroll Export',
    description: 'Employee hours for payroll processing',
    format: 'csv',
    options: {
      includeNotes: false,
      includeEmptyDays: false,
      groupByEmployee: true
    }
  }
}