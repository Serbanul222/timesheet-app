// Replace your components/auth/LoginForm.tsx with this version:

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/auth/useAuth'
import { toast } from 'sonner'
import { ForgotPasswordForm } from './ForgotPasswordForm'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Adresa de email este obligatorie')
    .email('Te rugăm să introduci o adresă de email validă'),
  password: z
    .string()
    .min(1, 'Parola este obligatorie')
    .min(6, 'Parola trebuie să aibă cel puțin 6 caractere')
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  className?: string
}

export function LoginForm({ className = '' }: LoginFormProps) {
  const router = useRouter()
  const { signIn, loading, error, clearError, user } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  // ✅ NEW: Validate user exists in database via API call instead of direct supabase
  const validateUserInDatabase = async (email: string) => {
    try {
      const response = await fetch(`/api/auth/validate-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      return data
    } catch (error) {
      console.error('User validation error:', error)
      return { exists: false, error: 'Validation failed' }
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    clearError()
    clearErrors()
    
    try {
      console.log('LoginForm: Attempting sign in...')
      
      // ✅ FIXED: Check if user exists in our profiles table via API
      const validation = await validateUserInDatabase(data.email)
      
      if (!validation.exists || validation.error) {
        console.log('LoginForm: User not authorized:', data.email)
        setError('email', {
          message: 'Această adresă de email nu este autorizată să acceseze sistemul. Te rugăm să contactezi administratorul.'
        })
        return
      }
      
      // Continue with existing signIn logic
      const result = await signIn(data.email, data.password)
      
      if (result.error) {
        console.error('LoginForm: Sign in failed:', result.error)
        
        // Better error handling
        if (result.error.includes('Invalid login credentials')) {
          setError('password', { message: 'Email sau parolă invalidă' })
        } else if (result.error.includes('Email not confirmed')) {
          setError('email', { message: 'Te rugăm să-ți verifici emailul și să dai click pe linkul de confirmare' })
        } else if (result.error.includes('Too many requests')) {
          setError('root', { message: 'Prea multe încercări de autentificare. Te rugăm să încerci din nou mai târziu.' })
        } else {
          setError('root', { message: result.error })
        }
        return
      }

      console.log('LoginForm: Sign in successful')
      toast.success(`Bun venit înapoi, ${validation.profile?.full_name || 'User'}!`, {
      })
      
      // ✅ FIX: Use router to trigger navigation (which triggers middleware)
      console.log('LoginForm: Sign in complete, navigating to trigger middleware')
      
      setTimeout(() => {
        router.push('/timesheets')
        router.refresh() // Ensure middleware runs
      }, 100)
      
    } catch (err) {
      console.error('LoginForm: Unexpected error:', err)
      setError('root', { message: 'A apărut o eroare neașteptată. Te rugăm să încerci din nou.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputFocus = () => {
    if (error) clearError()
    clearErrors()
  }

  // Show forgot password form when requested
  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
  }

  return (
    <div className={`w-full max-w-md space-y-6 ${className}`}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Autentificare în Ponteo
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Introduceți datele de autentificare pentru a-ți accesa contul
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Adresa de email
          </label>
          <input
            {...register('email')}
            type="email"
            id="email"
            autoComplete="email"
            onFocus={handleInputFocus}
            className={`
              w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm 
              placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
              focus:border-blue-500 transition-colors text-gray-900
              ${errors.email ? 'border-red-500 ring-1 ring-red-500' : ''}
            `}
            placeholder="popescu.ionut@example.com"
            disabled={isSubmitting || loading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password Input with Forgot Password Link */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Parola
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              Ai uitat parola?
            </button>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              onFocus={handleInputFocus}
              className={`
                w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm 
                placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 
                focus:border-blue-500 transition-colors text-gray-900
                ${errors.password ? 'border-red-500 ring-1 ring-red-500' : ''}
              `}
              placeholder="Introduceți parola"
              disabled={isSubmitting || loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              disabled={isSubmitting || loading}
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Global Error Display */}
        {(error || errors.root) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.root?.message || error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className={`
            w-full flex justify-center py-2 px-4 border border-transparent 
            rounded-md shadow-sm text-sm font-medium text-white 
            transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${isSubmitting || loading
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            }
          `}
        >
          {isSubmitting || loading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Autentificare...
            </div>
          ) : (
            'Autentifică-te'
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Ai nevoie de acces? Contactează administratorul sistemului.
        </p>
      </div>
    </div>
  )
}