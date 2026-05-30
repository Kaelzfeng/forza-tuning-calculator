import { ref, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'
import { useProAccess } from './useProAccess.js'

const favoriteIds = ref(new Set())
const loading = ref(false)

export function useFavorites() {
  const { user } = useAuth()
  const { isPro } = useProAccess()

  async function fetchFavorites() {
    if (!supabase || !user.value) {
      favoriteIds.value = new Set()
      return
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('vehicle_id')
        .eq('user_id', user.value.id)

      if (!error && data) {
        favoriteIds.value = new Set(data.map((r) => r.vehicle_id))
      }
    } catch {
      // ignore
    } finally {
      loading.value = false
    }
  }

  function isFavorite(vehicleId) {
    return favoriteIds.value.has(vehicleId)
  }

  async function toggleFavorite(vehicleId) {
    if (!supabase) return
    if (!user.value) {
      throw new Error('Login required')
    }
    if (!isPro.value) {
      throw new Error('Pro required')
    }

    const favourited = favoriteIds.value.has(vehicleId)

    if (favourited) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.value.id)
        .eq('vehicle_id', vehicleId)

      if (!error) {
        const next = new Set(favoriteIds.value)
        next.delete(vehicleId)
        favoriteIds.value = next
      }
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: user.value.id,
          vehicle_id: vehicleId,
        })

      if (!error) {
        const next = new Set(favoriteIds.value)
        next.add(vehicleId)
        favoriteIds.value = next
      }
    }
  }

  // Refetch when user changes
  watch(user, () => { fetchFavorites() }, { immediate: false })

  onMounted(() => {
    if (user.value) fetchFavorites()
  })

  return { favoriteIds, loading, fetchFavorites, isFavorite, toggleFavorite }
}
