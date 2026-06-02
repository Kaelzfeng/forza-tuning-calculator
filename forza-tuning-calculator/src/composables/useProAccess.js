import { computed } from 'vue'
import { useSubscription } from './useSubscription.js'

export function useProAccess() {
  const { profile, isPro, loading, error, refreshProfile } = useSubscription()

  const isActive = computed(() => {
    if (!profile.value) return false
    return ['active', 'completed', 'trialing'].includes(profile.value.subscription_status)
  })

  const expiresAt = computed(() => {
    return profile.value?.subscription_expires_at ?? null
  })

  return { isPro, isActive, expiresAt, profile, loading, error, refreshProfile }
}
