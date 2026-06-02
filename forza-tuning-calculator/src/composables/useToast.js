import { ref } from 'vue'

const toasts = ref([])
let _id = 0

export function useToast() {
  function add(message, type = 'info', durationMs = 3000) {
    const id = ++_id
    toasts.value.push({ id, message, type })
    if (durationMs > 0) {
      setTimeout(() => remove(id), durationMs)
    }
    return id
  }

  function remove(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function success(msg, dur) { return add(msg, 'success', dur) }
  function error(msg, dur)   { return add(msg, 'error', dur) }
  function info(msg, dur)    { return add(msg, 'info', dur) }
  function warning(msg, dur) { return add(msg, 'warning', dur) }

  return { toasts, add, remove, success, error, info, warning }
}
