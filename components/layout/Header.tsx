// components/layout/Header.tsx - Updated with Reports link
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { LogoutButton } from '@/components/auth/LogoutButton'

interface HeaderProps {
  className?: string
}

export function Header({ className = '' }: HeaderProps) {
  const { user, profile, signOut } = useAuth()
  const permissions = usePermissions()
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Navigation items based on user permissions
  const navigationItems = [
    {
      name: 'Timesheets',
      href: '/timesheets',
      show: permissions.canViewTimesheets
    },
    {
      name: 'Reports', // ✅ NEW: Reports navigation
      href: '/reports',
      show: permissions.canViewTimesheets // Same permission as timesheets
    }
  ].filter(item => item.show)

  // Don't render header if no user
  if (!user || !profile) {
    return null
  }

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/timesheets" className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900">
                  Timesheet Manager
                </h1>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="hidden md:flex space-x-8">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {profile.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleDisplayName(profile.role)}
                </p>
              </div>
              
              {/* User Avatar with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {profile.full_name.charAt(0).toUpperCase()}
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {profile.full_name}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Profile Settings
                    </Link>
                    
                    <div className="border-t border-gray-100 pt-1">
                      <div className="px-4 py-2">
                        <LogoutButton
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-800 hover:bg-red-50"
                          showIcon={true}
                          confirmLogout={true}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Sign Out Button - Always Visible */}
            <div className="md:hidden">
              <LogoutButton
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                showIcon={false}
                confirmLogout={true}
              />
            </div>

            {/* Desktop Sign Out Button - Always Visible */}
            <div className="hidden md:block">
              <LogoutButton
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                showIcon={true}
                confirmLogout={true}
              />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 pt-4 pb-3">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md"
              >
                {item.name}
              </Link>
            ))}
          </div>
          
          {/* Mobile user info */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="px-3 py-2">
              <p className="text-base font-medium text-gray-800">
                {profile.full_name}
              </p>
              <p className="text-sm text-gray-500">
                {getRoleDisplayName(profile.role)} • {user.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for dropdown menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  )
}

// Helper function to get user-friendly role names
function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'HR':
      return 'Human Resources'
    case 'ASM':
      return 'Area Sales Manager'
    case 'STORE_MANAGER':
      return 'Store Manager'
    default:
      return role
  }
}