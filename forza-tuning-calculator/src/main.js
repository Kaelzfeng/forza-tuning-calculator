import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/liquid-glass.css'
import './style.css'

const app = createApp(App).use(router)

router.isReady().then(() => {
  app.mount('#app')
  requestAnimationFrame(() => {
    window.__PRERENDER_READY = true
    window.dispatchEvent(new Event('app-ready'))
  })
})
