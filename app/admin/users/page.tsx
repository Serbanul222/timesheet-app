// app/admin/users/page.tsx

'use client'

import { AdminUserList } from '@/components/auth/AdminUserList'
import { MainLayout } from '@/components/layout/MainLayout'
import { useAuth } from '@/hooks/auth/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminUsersPage() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  // Effect to handle redirection for non-authorized users
  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'HR')) {
      console.log('Redirecting due to insufficient permissions. Role:', profile?.role || 'None')
      router.push('/timesheets')
    }
  }, [profile, loading, router])

  // Display a full-page loader while checking user authentication and role
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Verifying access...</p>
      </div>
    )
  }

  // A fallback UI for non-HR users before the redirect completes.
  // This ensures no sensitive content is ever rendered.
  if (!profile || profile.role !== 'HR') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-700">Access Denied</h1>
          <p className="mt-2 text-gray-700">
            You do not have permission to view this page. Redirecting...
          </p>
        </div>
      </div>
    )
  }

  // Once the user is verified as HR, render the page within the MainLayout
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Administration</h1>
          <p className="mt-2 text-gray-600">
            Manage user accounts, roles, and access to the timesheet system.
          </p>
        </div>
        
        {/* The AdminUserList component handles fetching and displaying users */}
        <AdminUserList />
      </div>
    </MainLayout>
  )
}