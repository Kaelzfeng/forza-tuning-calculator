import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/liquid-glass.css'
import './style.css'

// ── Microsoft Clarity ── browser + production only, skipped during prerender
if (typeof window !== 'undefined' && import.meta.env.VITE_CLARITY_ID) {
  ;(function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments) }
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y)
  })(window, document, 'clarity', 'script', import.meta.env.VITE_CLARITY_ID)
}

// ── Google Analytics 4 ── browser + production only, skipped during prerender
if (typeof window !== 'undefined' && import.meta.env.VITE_GA_ID) {
  const gaId = import.meta.env.VITE_GA_ID
  const script = document.createElement('script')
  script.async = 1
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  gtag('js', new Date())
  gtag('config', gaId)
}

const app = createApp(App).use(router)

router.isReady().then(() => {
  app.mount('#app')
  requestAnimationFrame(() => {
    window.__PRERENDER_READY = true
    window.dispatchEvent(new Event('app-ready'))
  })
})
