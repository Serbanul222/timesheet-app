import { forwardRef, HTMLAttributes, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Dialog variants - like your Button component's styling approach
const dialogVariants = cva(
  'relative bg-white rounded-lg shadow-xl z-10 w-full max-w-md mx-4',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        default: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

const overlayVariants = cva(
  'fixed inset-0 z-50 flex items-center justify-center p-4',
  {
    variants: {
      backdrop: {
        default: 'bg-black bg-opacity-50',
        blur: 'bg-black bg-opacity-50 backdrop-blur-sm',
        dark: 'bg-black bg-opacity-70'
      }
    },
    defaultVariants: {
      backdrop: 'default'
    }
  }
)

// Main Dialog Container
export interface DialogProps extends VariantProps<typeof overlayVariants> {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export function Dialog({ 
  open, 
  onOpenChange, 
  children, 
  backdrop,
  className 
}: DialogProps) {
  // Handle ESC key press - like keyboard listeners in Java Swing
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEsc)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div 
      className={cn(overlayVariants({ backdrop, className }))}
      onClick={() => onOpenChange(false)}
    >
      {children}
    </div>
  )
}

// Dialog Content - prevents click propagation (like stopPropagation in DOM events)
export interface DialogContentProps 
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dialogVariants> {}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, size, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(dialogVariants({ size, className }))}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
        {...props}
      >
        {children}
      </div>
    )
  }
)
DialogContent.displayName = 'DialogContent'

// Dialog Header
export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-4', className)}
        {...props}
      />
    )
  }
)
DialogHeader.displayName = 'DialogHeader'

// Dialog Title
export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = forwardRef<HTMLParagraphElement, DialogTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900', className)}
        {...props}
      />
    )
  }
)
DialogTitle.displayName = 'DialogTitle'

// Dialog Description
export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription = forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-gray-500', className)}
        {...props}
      />
    )
  }
)
DialogDescription.displayName = 'DialogDescription'

// Dialog Footer
export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 p-6 pt-4', className)}
        {...props}
      />
    )
  }
)
DialogFooter.displayName = 'DialogFooter'