import { ref, computed } from 'vue'
import messages from './messages.js'

const STORAGE_KEY = 'app_lang'
const SUPPORTED = ['en', 'zh']

function detectLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SUPPORTED.includes(stored)) return stored
  } catch {}
  return 'en'
}

const currentLang = ref(detectLang())

export function useI18n() {
  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return
    currentLang.value = lang
    try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
  }

  function t(key) {
    const parts = key.split('.')
    let result = messages[currentLang.value]
    for (const p of parts) {
      if (result == null) break
      result = result[p]
    }
    return result ?? key
  }

  return { currentLang, setLang, t }
}
