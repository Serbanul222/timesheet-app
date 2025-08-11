// Replace your components/auth/AdminUserList.tsx with this properly fixed version:

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { toast } from 'sonner'

interface UserWithAuth {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  auth_status: {
    exists: boolean
    email_confirmed: boolean
    last_sign_in_at?: string
    has_password: boolean
  }
}

export function AdminUserList() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserWithAuth[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ✅ FIXED: Define fetchUsers with useCallback to avoid dependency issues
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Fetching users from API...')
      
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      console.log('📊 API Response:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }
      
      setUsers(data.users)
      console.log('✅ Users loaded:', data.users.length)
      
    } catch (error) {
      console.error('❌ Error fetching users:', error)
      toast.error('Failed to fetch users', {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ✅ FIXED: useEffect after fetchUsers is defined
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ✅ FIXED: Early return AFTER all hooks
  if (profile?.role !== 'HR') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">Access denied. HR role required.</p>
      </div>
    )
  }

  const createAuthUser = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId)
      console.log('🔧 Creating auth user for:', userName)
      
      const response = await fetch(`/api/admin/users/${userId}/create-auth`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }
      
      toast.success(`Account created for ${userName}`, {
        description: 'Password setup email has been sent'
      })
      
      console.log('✅ Auth user created successfully')
      fetchUsers() // Refresh the list
      
    } catch (error: any) {
      console.error('❌ Error creating auth user:', error)
      toast.error('Failed to create account', { 
        description: error.message 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const resetPassword = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId)
      console.log('🔄 Resetting password for:', userName)
      
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }
      
      toast.success(`Password reset email sent to ${userName}`)
      console.log('✅ Password reset email sent')
      
    } catch (error: any) {
      console.error('❌ Error resetting password:', error)
      toast.error('Failed to send reset email', { 
        description: error.message 
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (user: UserWithAuth) => {
    if (!user.auth_status.exists) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          No Account
        </span>
      )
    }
    if (!user.auth_status.has_password) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Pending Setup
        </span>
      )
    }
    if (!user.auth_status.email_confirmed) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Unverified
        </span>
      )
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">User Management</h2>
        <button
          onClick={fetchUsers}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found in the system.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li key={user.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                        <div className="ml-2">{getStatusBadge(user)}</div>
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">
                        Role: {user.role} | 
                        {user.auth_status.last_sign_in_at 
                          ? ` Last login: ${new Date(user.auth_status.last_sign_in_at).toLocaleDateString()}`
                          : ' Never signed in'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!user.auth_status.exists ? (
                      <button
                        onClick={() => createAuthUser(user.id, user.full_name)}
                        disabled={actionLoading === user.id}
                        className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {actionLoading === user.id ? 'Creating...' : 'Create Account'}
                      </button>
                    ) : (
                      <button
                        onClick={() => resetPassword(user.id, user.full_name)}
                        disabled={actionLoading === user.id}
                        className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {actionLoading === user.id ? 'Sending...' : 'Reset Password'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}