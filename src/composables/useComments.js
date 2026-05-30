import { ref } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from './useAuth.js'

const comments = ref([])
const loading = ref(false)

export function useComments() {
  const { user } = useAuth()

  async function fetchComments(vehicleId) {
    if (!supabase || !vehicleId) {
      comments.value = []
      return
    }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        comments.value = data
      }
    } catch {
      // ignore
    } finally {
      loading.value = false
    }
  }

  async function addComment(vehicleId, content) {
    if (!supabase || !user.value) throw new Error('Login required')

    const trimmed = content.trim()
    if (trimmed.length < 3) throw new Error('Comment must be at least 3 characters.')
    if (trimmed.length > 1000) throw new Error('Comment must be under 1000 characters.')

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.value.id,
        user_email: user.value.email,
        vehicle_id: vehicleId,
        content: trimmed,
      })
      .select()
      .single()

    if (error) throw error
    if (data) comments.value.push(data)
  }

  async function deleteComment(commentId) {
    if (!supabase) return

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (!error) {
      comments.value = comments.value.filter((c) => c.id !== commentId)
    }
  }

  function anonymizeEmail(email) {
    if (!email) return 'unknown'
    const at = email.indexOf('@')
    if (at <= 3) return email.slice(0, 1) + '***' + email.slice(at)
    return email.slice(0, 3) + '***' + email.slice(at)
  }

  return { comments, loading, fetchComments, addComment, deleteComment, anonymizeEmail }
}
