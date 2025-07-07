'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'

interface HeaderProps {
  className?: string
}

export function Header({ className = '' }: HeaderProps) {
  const { user, profile, signOut } = useAuth()
  const permissions = usePermissions()
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  // Navigation items based on user permissions
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      show: true
    },
    {
      name: 'Timesheets',
      href: '/timesheets',
      show: permissions.canViewTimesheets
    },
    {
      name: 'Employees',
      href: '/employees',
      show: permissions.canViewEmployees
    },
    {
      name: 'Reports',
      href: '/reports',
      show: permissions.canExportTimesheets
    },
    {
      name: 'Admin',
      href: '/admin',
      show: permissions.canManageUsers
    }
  ].filter(item => item.show)

  // Handle sign out
  const handleSignOut = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      setIsSigningOut(true)
      try {
        await signOut()
        router.push('/login')
        router.refresh()
      } catch (error) {
        console.error('Sign out failed:', error)
        setIsSigningOut(false)
      }
    }
  }

  if (!user || !profile) {
    return null
  }

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center">
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
              
              {/* User Avatar */}
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
                      <button
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          isSigningOut 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {isSigningOut ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Signing out...
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button - Simple sign out */}
            <div className="md:hidden">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`text-sm rounded-md px-3 py-1 transition-colors ${
                  isSigningOut 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                }`}
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
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