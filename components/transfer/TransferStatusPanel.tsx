// components/transfer/TransferStatusPanel.tsx
'use client'

import { useMemo } from 'react'
import { useTransfer } from '@/hooks/transfer/useTransfer'
import { TransferValidationRules } from '@/lib/validation/transferValidationRules'
import { type TransferWithDetails, TRANSFER_STATUS_CONFIG } from '@/types/transfer'
import { formatDateEuropean } from '@/lib/utils/dateFormatting'
import { Button } from '@/components/ui/Button'

interface TransferStatusPanelProps {
  className?: string
  showPendingApprovals?: boolean
  showOverdueTransfers?: boolean
  showReadyForExecution?: boolean
  onTransferAction?: (transfer: TransferWithDetails, action: string) => void
}

export function TransferStatusPanel({
  className = '',
  showPendingApprovals = true,
  showOverdueTransfers = true,
  showReadyForExecution = true,
  onTransferAction
}: TransferStatusPanelProps) {
  const {
    pendingApprovals,
    overdueTransfers,
    readyForExecution,
    permissions,
    approveTransfer,
    rejectTransfer,
    completeTransfer,
    isLoading
  } = useTransfer({ autoRefresh: true })

  const sections = useMemo(() => {
    const result = []

    if (showPendingApprovals && pendingApprovals.length > 0 && permissions.canApproveTransfer) {
      result.push({
        title: 'Transferuri în așteptare de aprobare',
        transfers: pendingApprovals,
        type: 'pending' as const,
        icon: '⏳',
        color: 'yellow'
      })
    }

    if (showOverdueTransfers && overdueTransfers.length > 0) {
      result.push({
        title: 'Transferuri întârziate',
        transfers: overdueTransfers,
        type: 'overdue' as const,
        icon: '⚠️',
        color: 'red'
      })
    }

    if (showReadyForExecution && readyForExecution.length > 0) {
      result.push({
        title: 'Transferuri gata de executare',
        transfers: readyForExecution,
        type: 'ready' as const,
        icon: '✅',
        color: 'green'
      })
    }

    return result
  }, [
    pendingApprovals,
    overdueTransfers,
    readyForExecution,
    showPendingApprovals,
    showOverdueTransfers,
    showReadyForExecution,
    permissions.canApproveTransfer
  ])

  const handleQuickAction = async (transfer: TransferWithDetails, action: string) => {
    if (onTransferAction) {
      onTransferAction(transfer, action)
      return
    }

    // Default actions
    try {
      switch (action) {
        case 'approve':
          await approveTransfer(transfer)
          break
        case 'reject':
          await rejectTransfer(transfer)
          break
        case 'complete':
          await completeTransfer(transfer)
          break
      }
    } catch (error) {
      console.error('Transfer action failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (sections.length === 0) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {sections.map((section) => (
        <div 
          key={section.type} 
          className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${
            section.color === 'red' ? 'border-l-4 border-l-red-500' :
            section.color === 'yellow' ? 'border-l-4 border-l-yellow-500' :
            'border-l-4 border-l-green-500'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              <span className="mr-2">{section.icon}</span>
              {section.title}
              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                section.color === 'red' ? 'bg-red-100 text-red-800' :
                section.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {section.transfers.length}
              </span>
            </h3>
          </div>

          <div className="space-y-2">
            {section.transfers.map((transfer) => (
              <TransferStatusCard
                key={transfer.id}
                transfer={transfer}
                type={section.type}
                onAction={handleQuickAction}
                canApprove={permissions.canApproveTransfer}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface TransferStatusCardProps {
  transfer: TransferWithDetails
  type: 'pending' | 'overdue' | 'ready'
  onAction: (transfer: TransferWithDetails, action: string) => void
  canApprove: boolean
}

function TransferStatusCard({ 
  transfer, 
  type, 
  onAction, 
  canApprove 
}: TransferStatusCardProps) {
  const statusConfig = TRANSFER_STATUS_CONFIG[transfer.status]

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {transfer.employee?.full_name || 'Angajat necunoscut'}
          </h4>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            statusConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
            statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300' :
            statusConfig.color === 'green' ? 'bg-green-100 text-green-800 border-green-300' :
            statusConfig.color === 'red' ? 'bg-red-100 text-red-800 border-red-300' :
            'bg-gray-100 text-gray-800 border-gray-300'
          }`}>
            {statusConfig.label}
          </span>
        </div>
        
        <div className="mt-1 text-xs text-gray-600">
          <span className="mr-4">
            De la: {transfer.from_store?.name || 'Magazin necunoscut'}
          </span>
          <span className="mr-4">
            La: {transfer.to_store?.name || 'Magazin necunoscut'}
          </span>
          <span>
            Data: {formatDateEuropean(transfer.transfer_date)}
          </span>
        </div>
        
        {transfer.notes && (
          <div className="mt-1 text-xs text-gray-500 truncate">
            Notițe: {transfer.notes}
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-1 ml-3">
        {type === 'pending' && canApprove && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(transfer, 'approve')}
              className="text-green-600 border-green-300 hover:bg-green-50"
              title="Aprobă transferul"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(transfer, 'reject')}
              className="text-red-600 border-red-300 hover:bg-red-50"
              title="Respinge transferul"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </>
        )}
        
        {type === 'ready' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(transfer, 'complete')}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
            title="Execută transferul"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Execută
          </Button>
        )}
        
        {type === 'overdue' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAction(transfer, 'complete')}
            className="text-red-600 border-red-300 hover:bg-red-50"
            title="Execută transferul întârziat"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Urgent
          </Button>
        )}
      </div>
    </div>
  )
}