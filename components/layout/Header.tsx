// components/layout/Header.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth/useAuth'
import { usePermissions } from '@/hooks/auth/usePermissions'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'

interface HeaderProps {
  className?: string
}

// Beautiful icons for your navigation
const Icons = {
  timesheets: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  
  reports: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  
  admin: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  
  profile: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  
  settings: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export function Header({ className = '' }: HeaderProps) {
  const { user, profile, signOut } = useAuth()
  const permissions = usePermissions()
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  // Navigation items with beautiful icons and proper Button variants
  const navigationItems = [
    {
      name: 'Pontaje',
      href: '/timesheets',
      show: permissions.canViewTimesheets,
      icon: Icons.timesheets,
      variant: 'ghost' as const
    },
    {
      name: 'Raportare', 
      href: '/reports',
      show: permissions.canViewTimesheets,
      icon: Icons.reports,
      variant: 'ghost' as const
    },
    {
      name: 'Admin',
      href: '/admin/users',
      show: profile?.role === 'HR',
      icon: Icons.admin,
      variant: 'admin' as const // Special admin styling
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
            <Link href="/timesheets" className="flex items-center hover:opacity-80 transition-opacity">
              <Logo size="md" showText={true} />
            </Link>
          </div>

          {/* Navigation Menu - Beautiful Buttons */}
          <nav className="hidden md:flex space-x-3">
            {navigationItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={item.variant}
                  size="sm"
                  leftIcon={item.icon}
                  className="transition-all"
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {profile.full_name}
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  {getRoleDisplayName(profile.role)}
                </p>
              </div>
              
              {/* User Avatar with Dropdown */}
              <div className="relative">
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-8 h-8 text-xs font-medium"
                >
                  {profile.full_name.charAt(0).toUpperCase()}
                </Button>

                {/* Enhanced Dropdown Menu - matching your screenshot */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 overflow-hidden">
                    {/* User info header with better styling */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">
                        {profile.full_name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        {getRoleDisplayName(profile.role)}
                      </p>
                    </div>
                    
                    {/* Menu items */}
                    <div className="py-1">                       
                      {/* Admin link for HR users */}
                      {profile.role === 'HR' && (
                        <Link
                          href="/admin/users"
                          className="flex items-center px-4 py-3 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          {Icons.admin}
                          <span className="ml-3">Administrare utilizatori</span>
                        </Link>
                      )}
                      
                      {/* Logout section */}
                      <div className="border-t border-gray-200 mt-1 pt-1">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false)
                            signOut()
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="ml-3">Deconectare</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile - just the avatar */}
            <div className="sm:hidden">
              <Button
                variant="default"
                size="icon"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 text-xs font-medium"
              >
                {profile.full_name.charAt(0).toUpperCase()}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200 pt-4 pb-3">
          <div className="space-y-1 px-2">
            {navigationItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={item.variant}
                  size="default"
                  leftIcon={item.icon}
                  className="w-full justify-start"
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>
          
          {/* Mobile user info with logout */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="px-3 py-2">
              <p className="text-base font-medium text-gray-800">
                {profile.full_name}
              </p>
              <p className="text-sm text-gray-500">
                {getRoleDisplayName(profile.role)} • {user.email}
              </p>
            </div>
            
            {/* Mobile logout button */}
            <div className="px-2 mt-2">
              <button
                onClick={signOut}
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Deconectare
              </button>
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
      return 'Resurse umane'
    case 'ASM':
      return 'Area Sales Manager'
    case 'STORE_MANAGER':
      return 'Manager de magazin'
    default:
      return role
  }
}