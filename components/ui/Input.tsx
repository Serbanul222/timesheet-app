import { forwardRef, InputHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Input variants with black text by default
const inputVariants = cva(
  // Base styles with black text
  'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
  {
    variants: {
      // Different visual states
      variant: {
        default: 'focus:ring-blue-500 focus:border-blue-500',
        error: 'border-red-500 focus:ring-red-500 focus:border-red-500 ring-1 ring-red-500',
        success: 'border-green-500 focus:ring-green-500 focus:border-green-500'
      },
      // Size variations - renamed to avoid conflict with HTML size attribute
      inputSize: {
        default: 'h-10',
        sm: 'h-9 text-sm',
        lg: 'h-11 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default'
    }
  }
)

// Fix: Omit the conflicting 'size' property and add our custom props
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  containerClassName?: string
  // Add our own size prop if needed for HTML size attribute
  htmlSize?: number
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    variant,
    inputSize,
    type = 'text',
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    containerClassName,
    id,
    htmlSize,
    ...props
  }, ref) => {
    // Auto-generate ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    // Determine variant based on error state
    const effectiveVariant = error ? 'error' : variant

    return (
      <div className={cn('space-y-1', containerClassName)}>
        {/* Label with black text */}
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-900"
          >
            {label}
          </label>
        )}
        
        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400 sm:text-sm">
                {leftIcon}
              </span>
            </div>
          )}
          
          {/* Input Field with forced black text */}
          <input
            type={type}
            id={inputId}
            size={htmlSize}
            className={cn(
              inputVariants({ variant: effectiveVariant, inputSize }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              'text-gray-900', // Force black text
              className
            )}
            ref={ref}
            {...props}
          />
          
          {/* Right Icon */}
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <span className="text-gray-400 sm:text-sm">
                {rightIcon}
              </span>
            </div>
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {/* Helper Text */}
        {helperText && !error && (
          <p className="text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, inputVariants }