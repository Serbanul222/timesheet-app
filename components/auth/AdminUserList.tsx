// components/auth/AdminUserList.tsx - FIXED

'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/auth/useAuth'
import { useProfiles } from '@/hooks/admin/useProfiles'
import { ProfileCreationForm } from '@/components/admin/ProfileCreationForm'
import { ProfileBulkImport } from '@/components/admin/ProfileBulkImport'
import { ImportResultModal } from '@/components/admin/ImportResultModal'
import { toast } from 'sonner'

// This interface should already be correct based on the backend
interface UserWithAuth {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  zone?: { id: string; name: string };
  store?: { id: string; name: string };
  auth_status: {
    exists: boolean;
    email_confirmed: boolean;
    last_sign_in_at?: string | null;
    has_completed_setup: boolean;
    is_pending_setup: boolean;
    account_created_at?: string | null;
  };
}

interface BulkImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

type ViewMode = 'list' | 'create' | 'bulk-import'

export function AdminUserList() {
  const { profile } = useAuth()
  const { profiles, isLoading: profilesLoading, refetch: refetchProfiles } = useProfiles()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const users = profiles || []

  if (profile?.role !== 'HR') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">Access denied. HR role required.</p>
      </div>
    );
  }

  const createAuthUser = async (userId: string, userName: string) => {
    try {
      setActionLoading(userId)
      console.log('🔧 Creating auth user for:', userName)
      
      const response = await fetch(`/api/admin/users/${userId}/create-auth`, {
        method: 'POST',
      });
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }
      
      toast.success(`Account created for ${userName}`, {
        description: 'Password setup email has been sent'
      });
      
      console.log('✅ Auth user created successfully');
      // ✅ FIX: Call the refetch function from the useProfiles hook.
      refetchProfiles(); 
      
    } catch (error: any) {
      console.error('❌ Error creating auth user:', error)
      toast.error('Failed to create account', { 
        description: error.message 
      });
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
      });
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }
      
      toast.success(`Password reset email sent to ${userName}`)
      console.log('✅ Password reset email sent');
      
    } catch (error: any) {
      console.error('❌ Error resetting password:', error)
      toast.error('Failed to send reset email', { 
        description: error.message 
      });
    } finally {
      setActionLoading(null)
    }
  }

  const handleProfileCreated = (newProfile: any) => {
    setViewMode('list');
    refetchProfiles();
  }

  const handleImportComplete = (result: BulkImportResult) => {
    setImportResult(result);
    setViewMode('list');
    refetchProfiles();
    
    if (result.success > 0) {
      toast.success(`Import completed: ${result.success} profiles created`);
    }
    if (result.failed > 0) {
      toast.warning(`${result.failed} profiles failed to import`);
    }
  }

  // Accepts any user object with optional auth_status property
  const getStatusBadge = (user: { auth_status?: { exists: boolean; email_confirmed: boolean; last_sign_in_at?: string | null; has_completed_setup: boolean; is_pending_setup: boolean; account_created_at?: string | null } }) => {
    // Handle missing auth_status gracefully
    if (!user.auth_status) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          No Account
        </span>
      );
    }
    if (!user.auth_status.exists) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          No Account
        </span>
      );
    }
    
    if (user.auth_status.is_pending_setup) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          În așteptare
        </span>
      );
    }
    
    if (user.auth_status.has_completed_setup) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Activ
        </span>
      );
    }
    
    // This state is less likely now but is a good fallback.
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        Neverificat
      </span>
    );
  }

  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      'HR': 'bg-purple-100 text-purple-800',
      'ASM': 'bg-blue-100 text-blue-800',
      'STORE_MANAGER': 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role.replace('_', ' ')}
      </span>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.auth_status?.has_completed_setup ?? false).length,
    pending: users.filter(u => u.auth_status?.is_pending_setup ?? false).length,
    noAccount: users.filter(u => !(u.auth_status?.exists ?? false)).length,
  };

  if (profilesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">Administrare utilizatori</h2>
        <div className="flex space-x-3">
          {viewMode === 'list' && (
            <>
              <button
                onClick={() => setViewMode('create')}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Crează profil
              </button>
              <button
                onClick={() => setViewMode('bulk-import')}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Import în masă
              </button>
              <button
                onClick={() => {
                  refetchProfiles()
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Reîmprospătează
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Creation Form */}
      {viewMode === 'create' && (
        <ProfileCreationForm
          onProfileCreated={handleProfileCreated}
          onCancel={() => setViewMode('list')}
        />
      )}

      {/* Bulk Import Form */}
      {viewMode === 'bulk-import' && (
        <ProfileBulkImport
          onImportComplete={handleImportComplete}
          onCancel={() => setViewMode('list')}
        />
      )}

      {/* Import Result Modal */}
      {importResult && (
        <ImportResultModal
          result={importResult}
          onClose={() => setImportResult(null)}
        />
      )}

      {/* Statistics Cards */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.total}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total profile</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.active}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Utilizatori activi</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.pending}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">În așteptare</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.noAccount}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Fără cont</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.noAccount}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      {viewMode === 'list' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Caută după nume sau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">Toate rolurile</option>
                <option value="HR">HR</option>
                <option value="ASM">ASM</option>
                <option value="STORE_MANAGER">Manager de magazin</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* User List */}
      {viewMode === 'list' && (
        <>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm || roleFilter !== 'all' 
                  ? 'No users match your search criteria.' 
                  : 'No users found in the system.'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <li key={user.id}>
                    <div className="px-4 py-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            {getStatusBadge(user)}
                            {getRoleBadge(user.role)}
                          </div>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                            {user.zone && (
                              <span>Zonă: {user.zone.name}</span>
                            )}
                            {user.store && (
                              <span>Magazin: {user.store.name}</span>
                            )}
                            {user.auth_status?.last_sign_in_at ? (
                              <span>Ultima conectare: {new Date(user.auth_status.last_sign_in_at).toLocaleDateString()}</span>
                            ) : (
                              <span>Niciodată conectat</span>
                            )}
                          </div>
                          {user.auth_status?.account_created_at && (
                            <p className="text-xs text-gray-400">
                              Cont creat: {new Date(user.auth_status.account_created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!(user.auth_status?.exists) ? (
                          <button
                            onClick={() => createAuthUser(user.id, user.full_name)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {actionLoading === user.id ? 'Se crează...' : 'Creare cont'}
                          </button>
                        ) : (
                          <button
                            onClick={() => resetPassword(user.id, user.full_name)}
                            disabled={actionLoading === user.id}
                            className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {actionLoading === user.id ? 'Trimitere...' : 'Resetare parolă'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}