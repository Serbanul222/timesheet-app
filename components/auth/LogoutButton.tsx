 'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
  showConfirmation?: boolean
  redirectTo?: string
}

export function LogoutButton({ 
  variant = 'outline',
  size = 'default',
  className,
  children,
  showConfirmation = false,
  redirectTo = '/login'
}: LogoutButtonProps) {
  const router = useRouter()
  const { signOut, loading } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    // Show confirmation dialog if requested (like JOptionPane.showConfirmDialog in Java)
    if (showConfirmation) {
      const confirmed = window.confirm('Are you sure you want to sign out?')
      if (!confirmed) return
    }

    setIsLoggingOut(true)

    try {
      await signOut()
      
      toast.success('Signed out successfully', {
        description: 'You have been logged out'
      })
      
      // Redirect after successful logout
      router.push(redirectTo)
      router.refresh()
      
    } catch (error) {
      toast.error('Sign out failed', {
        description: 'Please try again'
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  const isDisabled = loading || isLoggingOut

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isDisabled}
      loading={isLoggingOut}
      leftIcon={
        !isLoggingOut ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
            />
          </svg>
        ) : undefined
      }
    >
      {children || (isLoggingOut ? 'Signing out...' : 'Sign Out')}
    </Button>
  )
}
