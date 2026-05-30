<script setup>
import { useRouter } from 'vue-router'
import { useSeoMeta, makeCollectionSchema } from '../composables/useSeoMeta.js'
import { useI18n } from '../i18n/index.js'

const router = useRouter()
const { t } = useI18n()

useSeoMeta({
  title: 'Forza Tuning Calculator | Free Tune Setup Generator',
  description: 'Generate stable Forza tuning setups for Road, Drift, Dirt and Drag builds. Free tuning calculator with suspension, tire pressure, gearing, and differential recommendations.',
  ogType: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Forza Tuning Calculator',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    description: 'Free Forza tuning calculator with suspension, tire pressure, gearing, and differential recommendations.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
})

const modes = [
  { id: 'road',  titleKey: 'home.roadTitle',  descKey: 'home.roadDesc',  icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { id: 'drift', titleKey: 'home.driftTitle', descKey: 'home.driftDesc', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 4-4v8zm2-6l4 4-4 4V11z' },
  { id: 'dirt',  titleKey: 'home.dirtTitle',  descKey: 'home.dirtDesc',  icon: 'M3 13.5C3 9.36 6.36 6 10.5 6h3C17.64 6 21 9.36 21 13.5S17.64 21 13.5 21h-3C6.36 21 3 17.64 3 13.5z' },
  { id: 'drag',  titleKey: 'home.dragTitle',  descKey: 'home.dragDesc',  icon: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z' },
]

function goToCalculator(mode) {
  router.push({ path: '/calculator', query: { mode } })
}
</script>

<template>
  <div class="home">
    <section class="hero liquid-panel">
      <div class="hero-badge">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        {{ t('home.unofficial') }}
      </div>
      <h1 class="hero-title">{{ t('home.title') }}</h1>
      <p class="hero-subtitle">{{ t('home.subtitle') }}</p>
      <div class="hero-actions">
        <button class="btn-primary hero-cta" @click="goToCalculator('road')">
          <span>{{ t('home.startTuning') }}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
        <router-link to="/tunes" class="hero-secondary-cta">
          Browse Community Tunes
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </router-link>
      </div>
    </section>

    <section class="modes-section">
      <p class="section-label">Choose Your Tuning Mode</p>
      <div class="modes">
        <div v-for="mode in modes" :key="mode.id" class="mode-card liquid-card" @click="goToCalculator(mode.id)">
          <div class="mode-icon glass-orb">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path :d="mode.icon" /></svg>
          </div>
          <div class="mode-body">
            <h3 class="mode-title">{{ t(mode.titleKey) }}</h3>
            <p class="mode-desc">{{ t(mode.descKey) }}</p>
          </div>
          <div class="mode-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>
    </section>

    <section class="about liquid-panel">
      <div class="about-body">
        <div class="about-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <h2 class="about-title">{{ t('home.aboutTitle') }}</h2>
        </div>
        <p class="about-text" v-html="t('home.aboutText')"></p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 56px;
  padding: 24px;
  padding-top: 48px;
  padding-bottom: 80px;
  scroll-margin-top: 80px;
}

/* ── Hero ── */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 24px;
  width: 100%;
  max-width: 640px;
  padding: 64px 52px;
  border-radius: 36px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 18px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.40);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    0 2px 8px rgba(0, 0, 0, 0.04);
  position: relative;
  z-index: 2;
}

.hero-title {
  font-size: clamp(2.6rem, 6.5vw, 4rem);
  font-weight: 780;
  color: #111827;
  line-height: 1.08;
  letter-spacing: -0.025em;
  margin: 0;
  position: relative;
  z-index: 2;
}

.hero-subtitle {
  font-size: 1.1rem;
  line-height: 1.65;
  color: #1f2937;
  max-width: 440px;
  margin: 0;
  position: relative;
  z-index: 2;
  font-weight: 500;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 2;
  margin-top: 4px;
}

.hero-cta {
  font-size: 0.95rem;
  padding: 0 32px;
}

.hero-secondary-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a6b85;
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.hero-secondary-cta:hover {
  color: #2d4a63;
  background: rgba(255, 255, 255, 0.30);
}

/* ── Section label ── */
.section-label {
  font-size: 0.80rem;
  font-weight: 650;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
}

/* ── Modes ── */
.modes-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 1040px;
}

.modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  width: 100%;
}

.mode-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px 28px 24px;
  border-radius: 24px;
}

.mode-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  color: #4a6b85;
  position: relative;
  z-index: 2;
  transition:
    transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1),
    box-shadow 0.35s ease;
}

.mode-card:hover .mode-icon {
  transform: scale(1.08);
  background: rgba(255, 255, 255, 0.40);
  border-color: rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.62),
    0 6px 20px rgba(74, 107, 133, 0.16),
    0 0 0 1px rgba(255, 255, 255, 0.15);
}

.mode-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  position: relative;
  z-index: 2;
}

.mode-title {
  font-size: 1.1rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
}

.mode-desc {
  font-size: 0.88rem;
  line-height: 1.55;
  font-weight: 500;
  color: #1f2937;
  margin: 0;
}

.mode-arrow {
  align-self: flex-end;
  color: #8a97a3;
  position: relative;
  z-index: 2;
  transition:
    transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1),
    color 0.35s ease;
}

.mode-card:hover .mode-arrow {
  transform: translateX(4px);
  color: #4a6b85;
}

/* ── About ── */
.about {
  width: 100%;
  max-width: 680px;
  border-radius: 24px;
}

.about-body {
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4a6b85;
}

.about-title {
  font-size: 1rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
}

.about-text {
  font-size: 0.875rem;
  line-height: 1.75;
  color: #374151;
  font-weight: 500;
  margin: 0;
}

.about-text strong {
  color: #111827;
  font-weight: 680;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .home {
    padding: 16px;
    padding-top: 32px;
    padding-bottom: 64px;
    gap: 52px;
  }

  .hero {
    padding: 44px 24px;
    border-radius: 28px;
    gap: 18px;
  }

  .hero-title {
    font-size: clamp(2rem, 9vw, 2.8rem);
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-actions {
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .hero-cta {
    width: 100%;
  }

  .hero-secondary-cta {
    justify-content: center;
  }

  .about {
    border-radius: 20px;
  }

  .about-body {
    padding: 22px 18px;
    gap: 10px;
  }

  .modes-section {
    gap: 12px;
  }

  .modes {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .mode-card {
    padding: 26px 22px 20px;
    border-radius: 20px;
    gap: 14px;
  }

  .mode-title {
    font-size: 1rem;
  }

  .mode-desc {
    font-size: 0.85rem;
  }
}
</style>
