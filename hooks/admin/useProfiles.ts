// hooks/admin/useProfiles.ts - FIXED VERSION
'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ProfileService, type EnhancedProfile, type CreateProfileRequest, type BulkImportResult } from '@/lib/services/profileSerivce'

export function useProfiles() {
  const queryClient = useQueryClient()

  // Fetch profiles with fixed configuration
  const {
    data: profiles = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: ProfileService.getProfiles,
    staleTime: 1000 * 60 * 5, // 5 minutes (increased)
    gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on component mount if data exists
    refetchInterval: false, // Disable automatic refetching
    retry: 1,
    retryOnMount: false // Prevent retry on mount
  })

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: ProfileService.createProfile,
    onSuccess: (newProfile) => {
      const profile = newProfile as EnhancedProfile
      // Use setQueryData instead of invalidateQueries to prevent refetch
      queryClient.setQueryData(['admin-profiles'], (oldData: EnhancedProfile[] = []) => {
        return [...oldData, profile]
      })
      
      toast.success('Profile created successfully', {
        description: `Profile for ${profile.full_name} has been created`
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to create profile', {
        description: error.message
      })
    }
  })

  // Manual refresh function that forces a refetch
  const forceRefresh = useCallback(() => {
    return refetch()
  }, [refetch])

  return {
    profiles,
    isLoading,
    error,
    refetch: forceRefresh, // Use the manual refresh function
    createProfile: createProfileMutation.mutate,
    isCreating: createProfileMutation.isPending
  }
}

export function useProfileFormData() {
  const [zones, setZones] = useState<Array<{ id: string; name: string }>>([])
  const [stores, setStores] = useState<Array<{ id: string; name: string; zone_id: string }>>([])
  const [loading, setLoading] = useState(true)

  const loadFormData = useCallback(async () => {
    try {
      setLoading(true)
      const [zonesData, storesData] = await Promise.all([
        ProfileService.getZones(),
        ProfileService.getStores()
      ])
      setZones(zonesData)
      setStores(storesData)
    } catch (error) {
      console.error('Failed to load form data:', error)
      toast.error('Failed to load zones and stores')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    zones,
    stores,
    loading,
    loadFormData
  }
}