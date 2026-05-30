import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const user = ref(null)
const loading = ref(true)
const error = ref(null)

export function useAuth() {
  let unsubscribe = null

  onMounted(() => {
    if (!supabase) {
      loading.value = false
      return
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!sessionError) {
        user.value = data.session?.user ?? null
      }
      loading.value = false
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null
    })

    unsubscribe = () => {
      listener?.subscription?.unsubscribe()
    }
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  async function signInWithMagicLink(email) {
    if (!supabase) return
    error.value = null
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    if (signInError) {
      error.value = signInError.message
      throw signInError
    }
  }

  async function signOut() {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) error.value = signOutError.message
  }

  return { user, loading, error, signInWithMagicLink, signOut }
}
