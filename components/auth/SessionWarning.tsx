'use client'

import { useEffect, useState } from 'react'
import { useSessionManager } from '@/hooks/auth/useSessionManager'
import { Button } from '@/components/ui/Button'

export function SessionWarning() {
  const sessionManager = useSessionManager()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(sessionManager.showWarning)
  }, [sessionManager.showWarning])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleExtend = () => {
    sessionManager.extendSession()
    setIsVisible(false)
  }

  const handleLogout = () => {
    sessionManager.forceLogout()
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-gray-500">
              Your session will expire in{' '}
              <span className="font-mono font-bold text-red-600">
                {formatTime(sessionManager.timeLeft)}
              </span>
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700">
            You've been inactive for a while. To continue using the application, 
            please extend your session or you'll be automatically logged out.
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleExtend}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Extend Session
          </Button>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout Now
          </Button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          For security, sessions expire after 30 minutes of inactivity
        </div>
      </div>
    </div>
  )
}