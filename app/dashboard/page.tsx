'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { useRouter } from 'next/navigation'
// Change this line - use default import instead of named import
import RoleGuard from '@/components/auth/RoleGuard'

export default function DashboardPage() {
  const { user, profile, loading, error, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      console.log('Dashboard: Starting sign out...')
      await signOut()
      console.log('Dashboard: Sign out completed, redirecting...')
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Dashboard: Sign out failed:', err)
      setIsSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-red-800 mb-2">Error</h2>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Not Authenticated</h2>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Timesheet Manager
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {profile?.full_name || user.email}
              </span>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`text-sm rounded-md px-3 py-1 transition-colors ${
                  isSigningOut 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'text-red-600 hover:text-red-800 hover:bg-red-50'
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
                  'Sign Out'
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Your Dashboard
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">User Information</h3>
                  <dl className="mt-2 space-y-1">
                    <div>
                      <dt className="inline text-sm font-medium text-gray-500">Email: </dt>
                      <dd className="inline text-sm text-gray-900">{user.email}</dd>
                    </div>
                    <div>
                      <dt className="inline text-sm font-medium text-gray-500">Name: </dt>
                      <dd className="inline text-sm text-gray-900">{profile?.full_name || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt className="inline text-sm font-medium text-gray-500">Role: </dt>
                      <dd className="inline text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          profile?.role === 'HR' ? 'bg-red-100 text-red-800' :
                          profile?.role === 'ASM' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {profile?.role || 'Not set'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                  <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Timesheets</h4>
                      <p className="text-sm text-gray-500">Manage employee time records</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Employees</h4>
                      <p className="text-sm text-gray-500">Manage staff information</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                      <h4 className="font-medium text-gray-900">Reports</h4>
                      <p className="text-sm text-gray-500">View analytics and exports</p>
                    </div>
                  </div>
                </div>

                {/* Debug Information */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Debug Information</h4>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p>User ID: {user.id}</p>
                      <p>Has Profile: {profile ? 'Yes' : 'No'}</p>
                      <p>Profile ID: {profile?.id || 'None'}</p>
                      <p>Environment: {process.env.NODE_ENV}</p>
                      <p>Sign Out State: {isSigningOut ? 'Signing out...' : 'Ready'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}