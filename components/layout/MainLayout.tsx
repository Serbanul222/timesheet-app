// components/layout/MainLayout.tsx
'use client'

import { Header } from '@/components/layout/Header'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

interface MainLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
}

export function MainLayout({ children, showHeader = true }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {showHeader && <Header />}
        <main className={`${showHeader ? '' : 'min-h-screen'}`}>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}