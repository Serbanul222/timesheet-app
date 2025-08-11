// Replace your app/admin/users/page.tsx with this complete version:

'use client'

import { AdminUserList } from '@/components/auth/AdminUserList'
import { useAuth } from '@/hooks/auth/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminUsersPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'HR')) {
      console.log('Redirecting non-HR user:', profile?.role)
      router.push('/timesheets')
    }
  }, [profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!profile || profile.role !== 'HR') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">HR role required. Your role: {profile?.role || 'None'}</p>
          <button 
            onClick={() => router.push('/timesheets')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Timesheets
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Administration</h1>
          <p className="mt-2 text-gray-600">
            Manage user accounts and access to the timesheet system
          </p>
        </div>
        
        {/* Admin User Management */}
        <AdminUserList />
      </div>
    </div>
  )
}