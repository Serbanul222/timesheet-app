// components/admin/ProfileBulkImport.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface BulkImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    email: string
    error: string
  }>
}

interface ProfileBulkImportProps {
  onImportComplete: (result: BulkImportResult) => void
  onCancel: () => void
}

export function ProfileBulkImport({ onImportComplete, onCancel }: ProfileBulkImportProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const template = [
      {
        email: 'example1@company.com',
        full_name: 'John Doe',
        role: 'STORE_MANAGER',
        zone_name: 'North Zone',
        store_name: 'Store 001'
      },
      {
        email: 'example2@company.com',
        full_name: 'Jane Smith',
        role: 'ASM',
        zone_name: 'South Zone',
        store_name: ''
      },
      {
        email: 'example3@company.com',
        full_name: 'Bob Johnson',
        role: 'HR',
        zone_name: '',
        store_name: ''
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Profiles Template')
    
    // Set column widths
    ws['!cols'] = [
      { width: 25 }, // email
      { width: 20 }, // full_name
      { width: 15 }, // role
      { width: 15 }, // zone_name
      { width: 15 }  // store_name
    ]

    XLSX.writeFile(wb, 'profiles_template.xlsx')
    toast.success('Template downloaded successfully')
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select an Excel file (.xlsx or .xls)')
      return
    }

    setSelectedFile(file)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      setPreviewData(jsonData.slice(0, 5)) // Show first 5 rows for preview
      
      toast.success(`File loaded: ${jsonData.length} rows found`)
    } catch (error) {
      console.error('Error reading file:', error)
      toast.error('Error reading file. Please check the format.')
      setSelectedFile(null)
    }
  }

  const processImport = async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    const result: BulkImportResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

      // Fetch zones and stores for mapping
      const [zonesResult, storesResult] = await Promise.all([
        supabase.from('zones').select('id, name'),
        supabase.from('stores').select('id, name, zone_id')
      ])

      const zones = zonesResult.data || []
      const stores = storesResult.data || []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        const rowNumber = i + 2 // Excel row number (starting from 2, accounting for header)

        try {
          // Validate required fields
          if (!row.email || !row.full_name || !row.role) {
            result.errors.push({
              row: rowNumber,
              email: row.email || 'N/A',
              error: 'Missing required fields (email, full_name, role)'
            })
            result.failed++
            continue
          }

          // Validate role
          if (!['HR', 'ASM', 'STORE_MANAGER'].includes(row.role)) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: 'Invalid role. Must be HR, ASM, or STORE_MANAGER'
            })
            result.failed++
            continue
          }

          // Map zone and store names to IDs
          let zone_id = null
          let store_id = null

          if (row.zone_name) {
            const zone = zones.find(z => z.name.toLowerCase() === row.zone_name.toLowerCase())
            if (!zone) {
              result.errors.push({
                row: rowNumber,
                email: row.email,
                error: `Zone "${row.zone_name}" not found`
              })
              result.failed++
              continue
            }
            zone_id = zone.id
          }

          if (row.store_name) {
            const store = stores.find(s => s.name.toLowerCase() === row.store_name.toLowerCase())
            if (!store) {
              result.errors.push({
                row: rowNumber,
                email: row.email,
                error: `Store "${row.store_name}" not found`
              })
              result.failed++
              continue
            }
            store_id = store.id
            zone_id = store.zone_id // Ensure zone_id matches store's zone
          }

          // Role-specific validations
          if (row.role === 'ASM' && !zone_id) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: 'ASM role requires a zone'
            })
            result.failed++
            continue
          }

          if (row.role === 'STORE_MANAGER' && !store_id) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: 'STORE_MANAGER role requires a store'
            })
            result.failed++
            continue
          }

          // Check if profile already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', row.email)
            .single()

          if (existingProfile) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: 'Profile with this email already exists'
            })
            result.failed++
            continue
          }

          // Create profile
          const profileData = {
            id: crypto.randomUUID(),
            email: row.email.trim(),
            full_name: row.full_name.trim(),
            role: row.role,
            zone_id,
            store_id,
            created_at: new Date().toISOString()
          }

          const { error } = await supabase
            .from('profiles')
            .insert(profileData)

          if (error) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: error.message
            })
            result.failed++
          } else {
            result.success++
          }

        } catch (error) {
          result.errors.push({
            row: rowNumber,
            email: row.email || 'N/A',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          result.failed++
        }
      }

      onImportComplete(result)

    } catch (error) {
      console.error('Import processing error:', error)
      toast.error('Failed to process import file')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Bulk Import Profiles</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        {/* Template Download */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Step 1: Download Template</h4>
          <p className="text-sm text-blue-700 mb-3">
            Download the Excel template with the correct format and example data.
          </p>
          <Button variant="outline" onClick={downloadTemplate}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Step 2: Upload Your File</h4>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!selectedFile ? (
              <div>
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 mb-2">Click to upload your Excel file</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Select File
                </Button>
              </div>
            ) : (
              <div>
                <svg className="w-12 h-12 mx-auto text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-900 font-medium">{selectedFile.name}</p>
                <p className="text-gray-600 text-sm">File selected successfully</p>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mt-2">
                  Choose Different File
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {previewData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Preview (First 5 rows)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.full_name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.role || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.zone_name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.store_name || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Format Requirements */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">📋 Format Requirements</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p><strong>Required columns:</strong> email, full_name, role</p>
            <p><strong>Valid roles:</strong> HR, ASM, STORE_MANAGER</p>
            <p><strong>Zone requirements:</strong> Required for ASM roles</p>
            <p><strong>Store requirements:</strong> Required for STORE_MANAGER roles</p>
            <p><strong>Zone/Store names:</strong> Must match exactly (case-insensitive)</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={processImport}
            disabled={!selectedFile || isProcessing}
            loading={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Import Profiles'}
          </Button>
        </div>
      </div>
    </div>
  )
}