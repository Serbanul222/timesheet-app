// components/reports/ExportPanelHeader.tsx
'use client'

import { Button } from '@/components/ui/Button'
import { Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExportState {
  lastExport?: {
    success: boolean
    filename: string
    timestamp: string
  } | null
}

interface ExportPanelHeaderProps {
  onRefresh: () => void
  isLoading: boolean
  lastExport: ExportState['lastExport']
}

export function ExportPanelHeader({ onRefresh, isLoading, lastExport }: ExportPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Download className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Exportare Foi de Pontaj</h2>
          <p className="text-sm text-gray-600">Selectați o perioadă și un format pentru a exporta datele.</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {lastExport && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {lastExport.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <span>Ultima: {new Date(lastExport.timestamp).toLocaleTimeString()}</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          leftIcon={<RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />}
        >
          Reîmprospătează
        </Button>
      </div>
    </div>
  )
}