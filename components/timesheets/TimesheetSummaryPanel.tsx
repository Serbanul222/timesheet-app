// // components/timesheets/TimesheetSummaryPanel.tsx - Only date format changes
// 'use client'

// import { Button } from '@/components/ui/Button'
// import { type EmployeeWithDetails } from '@/hooks/data/useEmployees'
// import { formatPeriodRange } from '@/lib/utils' // ✅ Use European date format

// interface Store {
//   id: string
//   name: string
//   zone_id: string
// }

// interface TimesheetSummaryPanelProps {
//   selectedEmployeeIds: string[]
//   selectedStoreId: string
//   timesheetData: {
//     startDate: string
//     endDate: string
//   }
//   stores: Store[]
//   regularEmployees: EmployeeWithDetails[]
//   delegatedEmployees: EmployeeWithDetails[]
//   historicalEmployees: EmployeeWithDetails[]
//   employees: EmployeeWithDetails[]
//   onSelectAll: () => void
//   onClearAll: () => void
//   isLoadingEmployees: boolean
// }

// export function TimesheetSummaryPanel({
//   selectedEmployeeIds,
//   selectedStoreId,
//   timesheetData,
//   stores,
//   regularEmployees,
//   delegatedEmployees,
//   historicalEmployees,
//   employees,
//   onSelectAll,
//   onClearAll,
//   isLoadingEmployees
// }: TimesheetSummaryPanelProps) {
//   if (selectedEmployeeIds.length === 0 || !selectedStoreId) {
//     return null
//   }

//   const regularCount = regularEmployees.filter(emp => selectedEmployeeIds.includes(emp.id)).length
//   const delegatedCount = delegatedEmployees.filter(emp => selectedEmployeeIds.includes(emp.id)).length

//   return (
//     <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
//       <div className="flex items-center justify-between">
//         <div>
//           <h4 className="text-sm font-medium text-blue-800">Timesheet Summary</h4>
//           <div className="text-sm text-blue-700 mt-1">
//             <span className="font-medium">{regularCount}</span> regular employees •
//             <span className="font-medium ml-1">{delegatedCount}</span> delegated employees • 
//             <span className="font-medium ml-1">
//               {/* ✅ Use European date format */}
//               {formatPeriodRange(timesheetData.startDate, timesheetData.endDate)}
//             </span> • 
//             <span className="font-medium ml-1">
//               {stores.find(s => s.id === selectedStoreId)?.name || 'Store selected'}
//             </span>
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={onSelectAll}
//             disabled={isLoadingEmployees || !selectedStoreId}
//           >
//             Select All
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={onClearAll}
//             disabled={selectedEmployeeIds.length === 0}
//           >
//             Clear All
//           </Button>
//         </div>
//       </div>
//     </div>
//   )
// }