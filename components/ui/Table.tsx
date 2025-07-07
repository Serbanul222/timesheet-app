import { forwardRef, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Main Table component (like a TableContainer in Java Swing)
const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(
          'w-full caption-bottom text-sm border-collapse',
          className
        )}
        {...props}
      />
    </div>
  )
)
Table.displayName = 'Table'

// Table Header component
const TableHeader = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn('border-b border-gray-200 bg-gray-50', className)} 
    {...props} 
  />
))
TableHeader.displayName = 'TableHeader'

// Table Body component
const TableBody = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-gray-200 bg-white', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

// Table Footer component
const TableFooter = forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t border-gray-200 bg-gray-50 font-medium', className)}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

// Table Row component
const TableRow = forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'hover:bg-gray-50 data-[state=selected]:bg-blue-50 transition-colors',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

// Table Header Cell component
const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
        className
      )}
      {...props}
    />
  )
)
TableHead.displayName = 'TableHead'

// Table Data Cell component
const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
        className
      )}
      {...props}
    />
  )
)
TableCell.displayName = 'TableCell'

// Table Caption component
const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-gray-500', className)}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}