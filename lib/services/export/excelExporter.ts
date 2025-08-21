// types/exports.ts - Tradus în limba română
export type ExportFormat = 'excel' // S-a eliminat 'csv'

export interface ExportOptions {
  // Filtrare dată
  dateRange?: {
    startDate: string
    endDate: string
  }
  
  // Filtrare magazin/zonă
  storeIds?: string[]
  zoneIds?: string[]
  
  // Filtrare angajat
  employeeIds?: string[]
  includeDelegated?: boolean
  
  // Opțiuni date
  includeNotes?: boolean
  includeEmptyDays?: boolean
  groupByStore?: boolean
  groupByEmployee?: boolean
  
  // Opțiuni specifice formatului
  maxRows?: number
  sheetNames?: {
    summary?: string
    details?: string
    employees?: string
  }
  
  // Opțiuni fișier
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
  // Informații sumar
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
  
  // Înregistrări pontaj
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
  
  // Informații angajați
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
  
  // Informații magazine
  stores: Array<{
    id: string
    name: string
    zoneId: string
    zoneName?: string
    employeeCount: number
    totalHours: number
    timesheetCount: number
  }>
  
  // Intrări zilnice (vizualizare detaliată)
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

// Șabloane de export predefinite, traduse în română
export const EXPORT_TEMPLATES: Record<string, ExportTemplate> = {
  detailed: {
    name: 'Raport Detaliat',
    description: 'Date complete de pontaj cu intrări zilnice',
    format: 'excel',
    options: {
      includeNotes: true,
      includeEmptyDays: false,
      groupByStore: true
    },
    sheets: [
      {
        name: 'Sumar',
        type: 'summary',
        columns: [
          { key: 'storeName', label: 'Magazin', type: 'string', width: 20 },
          { key: 'employeeCount', label: 'Angajați', type: 'number', width: 12 },
          { key: 'totalHours', label: 'Total Ore', type: 'number', width: 15 },
          { key: 'timesheetCount', label: 'Pontaje', type: 'number', width: 12 }
        ]
      },
      {
        name: 'Detalii Zilnice',
        type: 'details',
        columns: [
          { key: 'storeName', label: 'Magazin', type: 'string', width: 15 },
          { key: 'employeeName', label: 'Angajat', type: 'string', width: 20 },
          { key: 'position', label: 'Poziție', type: 'string', width: 15 },
          { key: 'date', label: 'Data', type: 'date', width: 12 },
          { key: 'dayOfWeek', label: 'Ziua', type: 'string', width: 10 },
          { key: 'timeInterval', label: 'Interval Orar', type: 'string', width: 12 },
          { key: 'hours', label: 'Ore', type: 'number', width: 10 },
          { key: 'status', label: 'Status', type: 'string', width: 12 },
          { key: 'notes', label: 'Notițe', type: 'string', width: 25 }
        ]
      }
    ]
  },
  
  summary: {
    name: 'Raport Sumar',
    description: 'Privire de ansamblu la nivel de magazin și angajat',
    format: 'excel',
    options: {
      includeNotes: false,
      includeEmptyDays: false,
      groupByStore: true
    },
    sheets: [
      {
        name: 'Sumar Magazine',
        type: 'stores',
        columns: [
          { key: 'storeName', label: 'Nume Magazin', type: 'string', width: 20 },
          { key: 'zoneName', label: 'Zonă', type: 'string', width: 15 },
          { key: 'employeeCount', label: 'Angajați', type: 'number', width: 12 },
          { key: 'totalHours', label: 'Total Ore', type: 'number', width: 15 },
          { key: 'timesheetCount', label: 'Pontaje', type: 'number', width: 12 }
        ]
      },
      {
        name: 'Sumar Angajați',
        type: 'employees',
        columns: [
          { key: 'name', label: 'Nume Angajat', type: 'string', width: 20 },
          { key: 'position', label: 'Poziție', type: 'string', width: 15 },
          { key: 'storeName', label: 'Magazin', type: 'string', width: 15 },
          { key: 'totalHours', label: 'Total Ore', type: 'number', width: 12 },
          { key: 'daysWorked', label: 'Zile Lucrate', type: 'number', width: 12 },
          { key: 'isDelegated', label: 'Delegat', type: 'string', width: 10 }
        ]
      }
    ]
  }
}