import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/auth/useAuth'

// Define the shape of a Store object for type safety
interface Store {
  id: string
  name: string
  zone_id: string
}

export function useStores() {
  const { profile } = useAuth()
  const [stores, setStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(true)

  useEffect(() => {
    const fetchStores = async () => {
      // Don't fetch if the user profile isn't loaded yet
      if (!profile) {
        setLoadingStores(true)
        return
      }
      
      setLoadingStores(true); // Set loading state at the start of the fetch
      try {
        let query = supabase.from('stores').select('id, name, zone_id').order('name')

        // Apply role-based filtering
        if (profile.role === 'STORE_MANAGER' && profile.store_id) {
          query = query.eq('id', profile.store_id)
        } else if (profile.role === 'ASM' && profile.zone_id) {
          query = query.eq('zone_id', profile.zone_id)
        }

        const { data, error } = await query
        if (error) throw error
        
        if (data) setStores(data)
      } catch (err) {
        console.error('Failed to fetch stores:', err)
        setStores([]) // Reset to empty array on error
      } finally {
        setLoadingStores(false)
      }
    }
    fetchStores()
  }, [profile]) // Re-run the effect only when the user profile changes

  return { stores, loadingStores }
}