// Replace your components/layout/Header.tsx with this updated version:

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
      name: 'Reports',
      href: '/reports',
      show: permissions.canViewTimesheets
    },
    // ✅ NEW: Admin panel for HR users
    {
      name: 'Admin',
      href: '/admin/users',
      show: profile?.role === 'HR', // Only show for HR users
      icon: (
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
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
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.name === 'Admin' 
                    ? 'text-purple-700 hover:text-purple-900 hover:bg-purple-50 border border-purple-200' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                {item.icon}
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

                    {/* ✅ NEW: Admin link in dropdown for HR users */}
                    {profile.role === 'HR' && (
                      <Link
                        href="/admin/users"
                        className="flex items-center px-4 py-2 text-sm text-purple-700 hover:bg-purple-50"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        User Administration
                      </Link>
                    )}
                    
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
                className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                  item.name === 'Admin'
                    ? 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.icon}
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