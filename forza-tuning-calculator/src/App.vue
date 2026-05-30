<script setup>
import { useRoute } from 'vue-router'
import AuthButton from './components/AuthButton.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import UpgradeProButton from './components/UpgradeProButton.vue'
import AppToast from './components/AppToast.vue'
import { useI18n } from './i18n/index.js'

const route = useRoute()
const { t } = useI18n()
</script>

<template>
  <div class="app-shell">
    <nav class="nav-bar">
      <div class="nav-inner liquid-panel">
        <router-link to="/" class="nav-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          FORZA TUNE
        </router-link>

        <div class="nav-links">
          <router-link to="/" :class="['nav-link', { active: route.path === '/' }]">
            {{ t('nav.home') }}
          </router-link>
          <router-link to="/calculator" :class="['nav-link', { active: route.path === '/calculator' }]">
            {{ t('nav.calculator') }}
          </router-link>
          <router-link to="/tunes" :class="['nav-link', { active: route.path.startsWith('/tunes') }]">
            {{ t('nav.tunes') }}
          </router-link>
          <router-link to="/vehicles" :class="['nav-link', { active: route.path.startsWith('/vehicles') }]">
            {{ t('nav.vehicles') }}
          </router-link>
        </div>

        <div class="nav-actions">
          <LanguageSwitcher />
          <UpgradeProButton />
          <AuthButton />
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>

    <AppToast />

    <footer class="footer">
      <div class="footer-inner liquid-panel">
        <p class="footer-name">{{ t('footer.name') }}</p>
        <p class="footer-disclaimer readable-layer">
          {{ t('footer.disclaimer') }}
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}

/* ── Nav bar ── */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 16px 24px 8px;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 24px;
  border-radius: 20px;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #0f1720;
  text-decoration: none;
  position: relative;
  z-index: 2;
}

.nav-links {
  display: flex;
  gap: 4px;
  position: relative;
  z-index: 2;
}

.nav-link {
  padding: 8px 18px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 550;
  color: #334155;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: #0f1720;
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nav-link.active {
  color: #0f1720;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.07),
    0 0 0 1px rgba(255, 255, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  transform: translateY(-1px);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 2;
}

/* ── Main ── */
.main-content {
  flex: 1;
  scroll-margin-top: 80px;
}

/* ── Footer ── */
.footer {
  padding: 24px;
  padding-bottom: 32px;
}

.footer-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 28px;
  border-radius: 24px;
  text-align: center;
}

.footer-name {
  font-size: 0.9rem;
  font-weight: 650;
  color: #0f1720;
  margin: 0 0 8px;
  position: relative;
  z-index: 2;
}

.footer-disclaimer {
  font-size: 0.78rem;
  line-height: 1.6;
  color: #475569;
  font-weight: 500;
  margin: 0;
  max-width: 520px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

@media (max-width: 640px) {
  .nav-bar {
    padding: 8px 12px;
  }

  .nav-inner {
    padding: 10px 16px;
    border-radius: 16px;
    flex-wrap: wrap;
    gap: 6px;
  }

  .nav-logo {
    font-size: 0.85rem;
    gap: 6px;
  }

  .nav-links {
    flex-wrap: wrap;
  }

  .nav-link {
    padding: 11px 14px;
    font-size: 0.82rem;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .footer {
    padding: 16px;
    padding-bottom: 24px;
  }

  .footer-inner {
    padding: 18px 16px;
    border-radius: 20px;
  }

  .footer-disclaimer {
    font-size: 0.75rem;
  }
}
</style>
