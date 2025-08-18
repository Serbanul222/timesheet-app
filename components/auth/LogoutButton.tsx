'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

interface LogoutButtonProps {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  showIcon?: boolean
  confirmLogout?: boolean
}

export function LogoutButton({
  variant = 'outline',
  size = 'default',
  className = '',
  showIcon = true,
  confirmLogout = true
}: LogoutButtonProps) {
  const { signOut } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    setShowModal(false) // Close modal
    
    try {
      await signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Sign out failed:', error)
      setIsSigningOut(false)
    }
  }

  const handleButtonClick = () => {
    if (confirmLogout) {
      setShowModal(true)
    } else {
      handleSignOut()
    }
  }

  const handleCancel = () => {
    setShowModal(false)
  }

  return (
    <>
      <Button
        onClick={handleButtonClick}
        disabled={isSigningOut}
        variant={variant}
        size={size}
        className={className}
        leftIcon={showIcon ? (
          isSigningOut ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )
        ) : null}
      >
        {isSigningOut ? 'Se deconectează...' : 'Deconectare'}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmă deconectarea</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să te deconectezi? Va trebui să te conectezi din nou pentru a-ți accesa contul.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
              Deconectare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}