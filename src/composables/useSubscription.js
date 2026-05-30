import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

const profile = ref(null)
const loading = ref(false)
const error = ref(null)

export function useSubscription() {
  const { user } = useAuth()

  const isPro = computed(() => {
    if (!profile.value) return false
    const s = profile.value
    if (!['active', 'completed', 'trialing'].includes(s.subscription_status)) return false
    if (!['pro', 'elite'].includes(s.plan)) return false
    if (s.subscription_expires_at && new Date(s.subscription_expires_at) <= new Date()) return false
    return true
  })

  async function refreshProfile() {
    if (!supabase || !user.value) {
      profile.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .maybeSingle()

      if (fetchError) {
        error.value = fetchError.message
      } else {
        profile.value = data || null
      }
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (user.value) refreshProfile()
  })

  watch(user, (u) => {
    if (u) refreshProfile()
    else profile.value = null
  })

  return { profile, isPro, loading, error, refreshProfile }
}
