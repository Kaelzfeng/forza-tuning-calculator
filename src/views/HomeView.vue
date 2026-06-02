<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { useSeoMeta, makeBreadcrumbSchema } from '../composables/useSeoMeta.js'
import { useI18n } from '../i18n/index.js'
import { generateSlug } from '../utils/slug.js'

const router = useRouter()
const { t } = useI18n()

useSeoMeta({
  title: 'Forza Tuning Calculator | Free Tune Setup Generator',
  description: 'Generate stable Forza tuning setups for Road, Drift, Dirt and Drag builds. Free tuning calculator with suspension, tire pressure, gearing, and differential recommendations.',
  ogType: 'website',
  jsonLd: [
    {
      '@type': 'WebApplication',
      name: 'Forza Tuning Calculator',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      description: 'Free Forza tuning calculator with suspension, tire pressure, gearing, and differential recommendations.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    makeBreadcrumbSchema([
      { name: 'Home', url: window.location.origin },
    ]),
  ],
})

// ── Hardcoded popular vehicles (always visible for CRO) ──
const CURATED_POPULAR = [
  { manufacturer: 'Nissan', name: 'Skyline GT-R R34', year: 2002, horsepower: 327, class: 'A', drivetrain: 'AWD', slug: 'nissan-skyline-gt-r-r34' },
  { manufacturer: 'Toyota', name: 'Supra MK4', year: 1998, horsepower: 320, class: 'A', drivetrain: 'RWD', slug: 'toyota-supra-mk4' },
  { manufacturer: 'BMW', name: 'M3 GTR', year: 2002, horsepower: 380, class: 'S1', drivetrain: 'RWD', slug: 'bmw-m3-gtr' },
  { manufacturer: 'Porsche', name: '911 GT3 RS', year: 2019, horsepower: 520, class: 'S1', drivetrain: 'RWD', slug: 'porsche-911-gt3-rs' },
]

const popularVehicles = ref([])
const popularLoading = ref(false)

async function fetchPopularVehicles() {
  popularLoading.value = true
  // Try Supabase
  if (supabase) {
    try {
      const names = CURATED_POPULAR.map(v => v.name)
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .in('name', names)
        .limit(6)
      if (!error && data && data.length > 0) {
        // Merge Supabase data, fallback to curated
        const dataMap = {}
        data.forEach(v => { dataMap[v.name] = v })
        popularVehicles.value = CURATED_POPULAR.map(curated => {
          const enriched = dataMap[curated.name]
          if (enriched) {
            return {
              ...curated,
              ...enriched,
              slug: enriched.slug || curated.slug,
              horsepower: enriched.horsepower || curated.horsepower,
            }
          }
          return { ...curated }
        })
        popularLoading.value = false
        return
      }
    } catch { /* fall through */ }
  }
  // Fallback: use curated data
  popularVehicles.value = CURATED_POPULAR.map(v => ({ ...v }))
  popularLoading.value = false
}

// ── Live Preview state ──
const preview = reactive({
  weight: 1400,
  horsepower: 400,
  drivetrain: 'AWD',
  buildType: 'Road',
})

const weightOptions = [900, 1100, 1300, 1400, 1600, 1800, 2000, 2200]
const horsepowerOptions = [200, 300, 400, 500, 600, 800, 1000]
const drivetrainOptions = ['AWD', 'RWD', 'FWD']
const buildTypeOptions = ['Road', 'Drift', 'Dirt', 'Drag']

// ── Latest Tunes ──
const latestTunes = ref([])
const tunesVisible = ref(true)
const tunesLoading = ref(false)

async function fetchLatestTunes() {
  tunesLoading.value = true
  if (!supabase) {
    tunesVisible.value = false
    tunesLoading.value = false
    return
  }
  try {
    const { data: tuneData, error: tError } = await supabase
      .from('tunes_public')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)

    if (tError || !tuneData || tuneData.length === 0) {
      tunesVisible.value = false
      tunesLoading.value = false
      return
    }

    const vehicleIds = [...new Set(tuneData.map(t => t.vehicle_id).filter(Boolean))]
    if (vehicleIds.length > 0) {
      try {
        const { data: vData } = await supabase
          .from('vehicles')
          .select('id, name, slug, manufacturer')
          .in('id', vehicleIds)
        const vMap = {}
        if (vData) vData.forEach(v => { vMap[v.id] = v })
        latestTunes.value = tuneData.map(t => ({
          ...t,
          vehicle_name: vMap[t.vehicle_id]?.name || 'Unknown Vehicle',
          vehicle_slug: vMap[t.vehicle_id]?.slug || '',
          tune_slug: t.slug || t.id,
        }))
      } catch {
        latestTunes.value = tuneData.map(t => ({
          ...t,
          vehicle_name: 'Unknown Vehicle',
          vehicle_slug: '',
          tune_slug: t.slug || t.id,
        }))
      }
    } else {
      latestTunes.value = tuneData.map(t => ({
        ...t,
        vehicle_name: 'Unknown Vehicle',
        vehicle_slug: '',
        tune_slug: t.slug || t.id,
      }))
    }
  } catch {
    tunesVisible.value = false
  }
  tunesLoading.value = false
}

onMounted(() => {
  fetchPopularVehicles()
  fetchLatestTunes()
})

function goToCalculator() {
  router.push('/calculator')
}

function goToVehicles() {
  router.push('/vehicles')
}

// Game mode colors (matching TuneCard)
const modeColors = {
  Road:    { bg: 'rgba(91,140,184,0.10)', border: 'rgba(91,140,184,0.22)', color: '#3d648c' },
  Dirt:    { bg: 'rgba(184,154,91,0.10)', border: 'rgba(184,154,91,0.22)', color: '#8c7434' },
  Drift:   { bg: 'rgba(139,91,184,0.10)', border: 'rgba(139,91,184,0.22)', color: '#6a3d8c' },
  Drag:    { bg: 'rgba(184,91,91,0.10)', border: 'rgba(184,91,91,0.22)', color: '#8c3d3d' },
  Circuit: { bg: 'rgba(91,140,184,0.10)', border: 'rgba(91,140,184,0.22)', color: '#3d648c' },
  Rally:   { bg: 'rgba(184,154,91,0.10)', border: 'rgba(184,154,91,0.22)', color: '#8c7434' },
}
function modeStyle(mode) {
  return modeColors[mode] || { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.18)', color: '#4a5568' }
}
</script>

<template>
  <div class="home">

    <!-- ═══════════ Hero ═══════════ -->
    <section class="hero liquid-panel">
      <h1 class="hero-title">{{ t('home.heroTitle') }}</h1>
      <p class="hero-subtitle">{{ t('home.heroSubtitle') }}</p>
      <p class="hero-desc">{{ t('home.heroDesc') }}</p>
      <div class="hero-actions">
        <button class="hero-cta btn-glass" @click="goToCalculator">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {{ t('home.startTuning') }}
        </button>
        <button class="hero-secondary" @click="goToVehicles">
          {{ t('home.browseVehicles') }}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </section>

    <!-- ═══════════ Trust Strip ═══════════ -->
    <section class="trust-strip">
      <div class="trust-card glass-card-soft">
        <span class="trust-value">617+</span>
        <span class="trust-label">{{ t('home.trustVehicles') }}</span>
      </div>
      <div class="trust-card glass-card-soft">
        <span class="trust-value">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </span>
        <span class="trust-label">{{ t('home.trustTunes') }}</span>
      </div>
      <div class="trust-card glass-card-soft">
        <span class="trust-value">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span class="trust-label">{{ t('home.trustFree') }}</span>
      </div>
      <div class="trust-card glass-card-soft">
        <span class="trust-value">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>
        <span class="trust-label">{{ t('home.trustFast') }}</span>
      </div>
    </section>

    <!-- ═══════════ Live Tune Generator Preview ═══════════ -->
    <section class="live-preview liquid-panel">
      <h2 class="section-title">{{ t('home.livePreviewTitle') }}</h2>
      <div class="preview-grid">
        <div class="preview-field">
          <label class="preview-label">{{ t('home.liveWeight') }}</label>
          <select v-model="preview.weight" class="preview-select">
            <option v-for="w in weightOptions" :key="w" :value="w">{{ w }} kg</option>
          </select>
        </div>
        <div class="preview-field">
          <label class="preview-label">{{ t('home.liveHorsepower') }}</label>
          <select v-model="preview.horsepower" class="preview-select">
            <option v-for="hp in horsepowerOptions" :key="hp" :value="hp">{{ hp }} HP</option>
          </select>
        </div>
        <div class="preview-field">
          <label class="preview-label">{{ t('home.liveDrivetrain') }}</label>
          <select v-model="preview.drivetrain" class="preview-select">
            <option v-for="d in drivetrainOptions" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div class="preview-field">
          <label class="preview-label">{{ t('home.liveBuildType') }}</label>
          <select v-model="preview.buildType" class="preview-select">
            <option v-for="b in buildTypeOptions" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
      </div>
      <button class="preview-generate-btn btn-glass" @click="goToCalculator">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {{ t('home.liveGenerate') }}
      </button>
    </section>

    <!-- ═══════════ Why Use This Tool ═══════════ -->
    <section class="why-section">
      <h2 class="section-title">{{ t('home.whyTitle') }}</h2>
      <div class="why-grid">
        <div class="why-card glass-card-soft">
          <div class="why-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h3 class="why-card-title">{{ t('home.whyInstantTitle') }}</h3>
          <p class="why-card-desc">{{ t('home.whyInstantDesc') }}</p>
        </div>
        <div class="why-card glass-card-soft">
          <div class="why-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3 class="why-card-title">{{ t('home.whyDrivetrainTitle') }}</h3>
          <p class="why-card-desc">{{ t('home.whyDrivetrainDesc') }}</p>
        </div>
        <div class="why-card glass-card-soft">
          <div class="why-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 22l2-4 4 2-2 4z" /><path d="M22 2L11 13" /><path d="M22 2l-7 21-4-10-10-4 21-7z" />
            </svg>
          </div>
          <h3 class="why-card-title">{{ t('home.whyOptimizedTitle') }}</h3>
          <p class="why-card-desc">{{ t('home.whyOptimizedDesc') }}</p>
        </div>
      </div>
    </section>

    <!-- ═══════════ Top Rankings ═══════════ -->
    <section class="section">
      <h2 class="section-title">Top Rankings</h2>
      <div class="rankings-grid">
        <router-link to="/best-awd-cars" class="ranking-link-card glass-card-soft">
          <span class="ranking-link-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </span>
          <span class="ranking-link-text">Best AWD Cars</span>
        </router-link>
        <router-link to="/best-drift-cars" class="ranking-link-card glass-card-soft">
          <span class="ranking-link-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 18a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4" /><circle cx="18" cy="6" r="3" /><path d="M18 9v4" />
            </svg>
          </span>
          <span class="ranking-link-text">Best Drift Cars</span>
        </router-link>
        <router-link to="/best-beginner-cars" class="ranking-link-card glass-card-soft">
          <span class="ranking-link-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </span>
          <span class="ranking-link-text">Best Beginner Cars</span>
        </router-link>
        <router-link to="/best-s1-cars" class="ranking-link-card glass-card-soft">
          <span class="ranking-link-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
          <span class="ranking-link-text">Best S1 Cars</span>
        </router-link>
      </div>
    </section>

    <!-- ═══════════ Learn Tuning ═══════════ -->
    <section class="section">
      <h2 class="section-title">{{ t('guides.learnTuning', 'Learn Tuning') }}</h2>
      <div class="learn-grid">
        <router-link to="/guides/how-to-tune-awd" class="learn-card glass-card-soft">
          <span class="learn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          </span>
          <span class="learn-text">How To Tune AWD</span>
        </router-link>
        <router-link to="/guides/how-to-tune-rwd" class="learn-card glass-card-soft">
          <span class="learn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 18a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4" /><circle cx="18" cy="6" r="3" /><path d="M18 9v4" />
            </svg>
          </span>
          <span class="learn-text">How To Tune RWD</span>
        </router-link>
        <router-link to="/guides/road-tuning-guide" class="learn-card glass-card-soft">
          <span class="learn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </span>
          <span class="learn-text">Road Tuning Guide</span>
        </router-link>
        <router-link to="/guides/drift-tuning-guide" class="learn-card glass-card-soft">
          <span class="learn-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 22l2-4 4 2-2 4z" /><path d="M22 2L11 13" /><path d="M22 2l-7 21-4-10-10-4 21-7z" />
            </svg>
          </span>
          <span class="learn-text">Drift Tuning Guide</span>
        </router-link>
      </div>
    </section>

    <!-- ═══════════ Popular Vehicles ═══════════ -->
    <section v-if="popularVehicles.length > 0" class="section">
      <h2 class="section-title">{{ t('home.popularVehicles') }}</h2>
      <div class="popular-grid">
        <router-link
          v-for="v in popularVehicles"
          :key="v.slug"
          :to="`/vehicles/${v.slug}`"
          class="pop-card glass-card-soft"
        >
          <div class="pop-card-body">
            <span class="pop-manufacturer">{{ v.manufacturer }}</span>
            <h3 class="pop-name">{{ v.name }}</h3>
            <div class="pop-meta">
              <span v-if="v.year" class="pop-tag">{{ v.year }}</span>
              <span v-if="v.class" class="pop-tag pop-class">{{ v.class }}</span>
              <span v-if="v.drivetrain" class="pop-tag pop-drivetrain">{{ v.drivetrain }}</span>
            </div>
          </div>
          <div class="pop-hp" v-if="v.horsepower">
            <span class="pop-hp-value">{{ v.horsepower }}</span>
            <span class="pop-hp-label">HP</span>
          </div>
          <div class="pop-arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </router-link>
      </div>
    </section>

    <!-- Loading skeleton for popular -->
    <section v-if="popularLoading" class="section">
      <h2 class="section-title">{{ t('home.popularVehicles') }}</h2>
      <div class="popular-grid">
        <div v-for="n in 4" :key="n" class="pop-card glass-skeleton" style="height:88px;border-radius:16px;" />
      </div>
    </section>

    <!-- ═══════════ Latest Tunes ═══════════ -->
    <section v-if="tunesVisible && latestTunes.length > 0" class="section">
      <h2 class="section-title">{{ t('home.latestTunes') }}</h2>
      <div class="tunes-grid">
        <router-link
          v-for="tune in latestTunes"
          :key="tune.id"
          :to="`/tunes/${tune.tune_slug}`"
          class="tune-card-item liquid-card"
        >
          <div class="tc-top">
            <span v-if="tune.share_code" class="tc-code">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {{ tune.share_code }}
            </span>
            <span v-else class="tc-no-code">No code</span>
          </div>

          <h3 class="tc-title">{{ tune.title || 'Untitled Tune' }}</h3>

          <div v-if="tune.vehicle_name" class="tc-vehicle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            {{ tune.vehicle_name }}
          </div>

          <div class="tc-meta">
            <span v-if="tune.game_mode" class="tc-mode" :style="{
              background: modeStyle(tune.game_mode).bg,
              borderColor: modeStyle(tune.game_mode).border,
              color: modeStyle(tune.game_mode).color,
            }">{{ tune.game_mode }}</span>
            <span v-if="tune.drivetrain" class="tc-tag">{{ tune.drivetrain }}</span>
            <span v-if="tune.class" class="tc-tag">{{ tune.class }}</span>
          </div>
        </router-link>
      </div>
    </section>

    <!-- ═══════════ Bottom CTA ═══════════ -->
    <section class="bottom-cta liquid-panel">
      <h2 class="bottom-title">{{ t('home.bottomCtaTitle') }}</h2>
      <p class="bottom-desc">{{ t('home.bottomCtaDesc') }}</p>
      <button class="bottom-btn btn-glass" @click="goToCalculator">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        {{ t('home.startTuning') }}
      </button>
    </section>

  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 48px;
  padding: 24px;
  padding-top: 48px;
  padding-bottom: 80px;
}

/* ═══════════ Hero ═══════════ */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
  width: 100%;
  max-width: 640px;
  padding: 56px 48px;
  border-radius: 32px;
}

.hero-title {
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-weight: 780;
  color: #000000;
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin: 0;
  position: relative;
  z-index: 2;
}

.hero-subtitle {
  font-size: 1.05rem;
  font-weight: 650;
  color: #000000;
  margin: 0;
  position: relative;
  z-index: 2;
  line-height: 1.4;
}

.hero-desc {
  font-size: 0.90rem;
  line-height: 1.65;
  color: #111111;
  max-width: 460px;
  margin: 0;
  position: relative;
  z-index: 2;
  font-weight: 500;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 2;
  margin-top: 4px;
}

.hero-cta {
  font-size: 0.95rem;
  padding: 0 30px;
  gap: 10px;
  font-weight: 640;
}

.hero-secondary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.84rem;
  font-weight: 620;
  color: #2d4a63;
  padding: 10px 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(14px) saturate(145%);
  -webkit-backdrop-filter: blur(14px) saturate(145%);
  border: 1px solid rgba(255, 255, 255, 0.55);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.45);
}

.hero-secondary:hover {
  color: #2d4a63;
  background: rgba(255, 255, 255, 0.86);
  border-color: rgba(91, 122, 154, 0.36);
  transform: translateY(-1px);
}

/* ═══════════ Trust Strip ═══════════ */
.trust-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  width: 100%;
  max-width: 680px;
}

.trust-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 22px 14px;
  border-radius: 18px;
  text-align: center;
  position: relative;
  z-index: 2;
}

.trust-value {
  font-size: 1.3rem;
  font-weight: 720;
  color: #000000;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trust-value svg {
  color: #4a6b85;
}

.trust-label {
  font-size: 0.66rem;
  font-weight: 620;
  color: #4a6b85;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ═══════════ Live Preview ═══════════ */
.live-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 720px;
  padding: 40px 44px;
  border-radius: 24px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  width: 100%;
}

.preview-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  position: relative;
  z-index: 2;
}

.preview-label {
  font-size: 0.62rem;
  font-weight: 650;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-select {
  min-height: var(--input-height, 44px);
  padding: 0 32px 0 14px;
  border-radius: var(--radius-inner, 16px);
  font-size: 0.86rem;
  font-weight: 580;
  font-family: inherit;
  color: #000000;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid rgba(180, 190, 200, 0.38);
  box-shadow:
    0 1px 4px rgba(0,0,0,0.04),
    inset 0 1px 0 rgba(255,255,255,0.52);
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%234a6b85' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.preview-select:hover {
  border-color: rgba(140, 155, 175, 0.52);
  background: rgba(255, 255, 255, 0.88);
}

.preview-select:focus {
  border-color: rgba(91, 122, 154, 0.55);
  box-shadow:
    0 0 0 3px rgba(91, 122, 154, 0.1),
    0 1px 4px rgba(0,0,0,0.04),
    inset 0 1px 0 rgba(255,255,255,0.58);
}

.preview-generate-btn {
  position: relative;
  z-index: 2;
  font-size: 0.95rem;
  padding: 0 36px;
  gap: 10px;
  font-weight: 640;
}

/* ═══════════ Why Use This Tool ═══════════ */
.why-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 940px;
}

.why-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.why-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px 24px;
  border-radius: 20px;
  position: relative;
  z-index: 2;
}

.why-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: #4a6b85;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(91, 122, 154, 0.16);
}

.why-card-title {
  font-size: 0.92rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
  line-height: 1.25;
}

.why-card-desc {
  font-size: 0.80rem;
  line-height: 1.6;
  color: #333333;
  margin: 0;
  font-weight: 480;
}

/* ═══════════ Top Rankings ═══════════ */
.rankings-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.ranking-link-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
}

.ranking-link-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

.ranking-link-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #4a6b85;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(91, 122, 154, 0.14);
  flex-shrink: 0;
}

.ranking-link-text {
  font-size: 0.82rem;
  font-weight: 640;
  color: #000000;
  line-height: 1.2;
}

/* ═══════════ Learn Tuning ═══════════ */
.learn-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.learn-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
}

.learn-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

.learn-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #4a6b85;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(91, 122, 154, 0.14);
  flex-shrink: 0;
}

.learn-text {
  font-size: 0.82rem;
  font-weight: 640;
  color: #000000;
  line-height: 1.2;
}

/* ═══════════ Sections ═══════════ */
.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 1040px;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
  letter-spacing: -0.01em;
}

/* ═══════════ Popular Vehicles ═══════════ */
.popular-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.pop-card {
  display: flex;
  gap: 16px;
  padding: 20px 22px;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
  align-items: center;
}

.pop-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}

.pop-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.pop-manufacturer {
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pop-name {
  font-size: 0.90rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pop-meta {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.pop-tag {
  font-size: 0.62rem;
  font-weight: 600;
  color: #374151;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.60);
  border: 1px solid rgba(255, 255, 255, 0.48);
}

.pop-class {
  color: #5b7a9a;
}

.pop-drivetrain {
  color: #6b859e;
}

.pop-hp {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.pop-hp-value {
  font-size: 1.25rem;
  font-weight: 720;
  color: #000000;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.pop-hp-label {
  font-size: 0.56rem;
  font-weight: 650;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pop-arrow {
  flex-shrink: 0;
  color: #bcc5cf;
  display: flex;
  align-items: center;
  transition: color 0.2s ease, transform 0.2s ease;
}

.pop-card:hover .pop-arrow {
  color: #5b7a9a;
  transform: translateX(2px);
}

/* ═══════════ Latest Tunes ═══════════ */
.tunes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}

.tune-card-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
}

.tc-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tc-code {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 660;
  letter-spacing: 0.06em;
  color: #2d4a63;
  background: rgba(74, 107, 133, 0.07);
  border: 1px solid rgba(91, 122, 154, 0.24);
}

.tc-no-code {
  font-size: 0.66rem;
  color: #9ca3af;
  font-style: italic;
}

.tc-title {
  font-size: 0.92rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
  line-height: 1.2;
}

.tc-vehicle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 550;
  color: #5b7a9a;
}

.tc-vehicle svg {
  flex-shrink: 0;
  color: #8a97a3;
}

.tc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tc-mode {
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 0.62rem;
  font-weight: 650;
  border: 1px solid;
  letter-spacing: 0.02em;
}

.tc-tag {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.60rem;
  font-weight: 600;
  color: #111111;
  background: rgba(255, 255, 255, 0.60);
  border: 1px solid rgba(255, 255, 255, 0.48);
}

/* ═══════════ Bottom CTA ═══════════ */
.bottom-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 52px 40px;
  border-radius: 28px;
  width: 100%;
  max-width: 560px;
  margin-top: 8px;
}

.bottom-title {
  font-size: 1.35rem;
  font-weight: 720;
  color: #000000;
  margin: 0;
  line-height: 1.2;
  position: relative;
  z-index: 2;
}

.bottom-desc {
  font-size: 0.92rem;
  color: #111111;
  margin: 0;
  font-weight: 500;
  position: relative;
  z-index: 2;
}

.bottom-btn {
  position: relative;
  z-index: 2;
  font-size: 0.95rem;
  padding: 0 32px;
  gap: 10px;
  font-weight: 640;
  margin-top: 4px;
}

/* ═══════════ Mobile ═══════════ */
@media (max-width: 640px) {
  .home {
    padding: 16px;
    padding-top: 32px;
    padding-bottom: 64px;
    gap: 40px;
  }

  /* ── Hero mobile ── */
  .hero {
    padding: 40px 22px;
    border-radius: 26px;
    gap: 16px;
  }

  .hero-title {
    font-size: clamp(1.9rem, 8vw, 2.6rem);
  }

  .hero-subtitle {
    font-size: 0.92rem;
  }

  .hero-desc {
    font-size: 0.84rem;
  }

  .hero-actions {
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }

  .hero-cta {
    width: 100%;
    justify-content: center;
  }

  .hero-secondary {
    width: 100%;
    justify-content: center;
  }

  /* ── Trust mobile: 2-col ── */
  .trust-strip {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .trust-card {
    padding: 18px 12px;
    gap: 4px;
  }

  .trust-value {
    font-size: 1.15rem;
  }

  /* ── Live Preview mobile ── */
  .live-preview {
    padding: 32px 20px;
    border-radius: 20px;
    gap: 20px;
  }

  .preview-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .preview-generate-btn {
    width: 100%;
    justify-content: center;
  }

  /* ── Why mobile: single column ── */
  .why-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .why-card {
    padding: 22px 20px;
  }

  /* ── Learn Tuning mobile: 2-col ── */
  .learn-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .learn-card {
    padding: 14px 16px;
    gap: 10px;
  }

  .learn-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
  }

  .learn-text {
    font-size: 0.76rem;
  }

  /* ── Rankings mobile: 2-col ── */
  .rankings-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .ranking-link-card {
    padding: 14px 16px;
    gap: 8px;
  }

  .ranking-link-icon {
    width: 34px;
    height: 34px;
    border-radius: 8px;
  }

  .ranking-link-text {
    font-size: 0.76rem;
  }

  /* ── Popular mobile: single column ── */
  .popular-grid {
    grid-template-columns: 1fr;
  }

  .pop-card {
    padding: 16px 18px;
    gap: 12px;
  }

  .pop-name {
    font-size: 0.84rem;
  }

  .pop-hp-value {
    font-size: 1.1rem;
  }

  /* ── Tunes mobile: single column ── */
  .tunes-grid {
    grid-template-columns: 1fr;
  }

  .tune-card-item {
    padding: 16px 18px;
  }

  /* ── Bottom CTA mobile ── */
  .bottom-cta {
    padding: 40px 24px;
    border-radius: 24px;
    gap: 12px;
  }

  .bottom-title {
    font-size: 1.15rem;
  }

  .bottom-desc {
    font-size: 0.85rem;
  }

  .bottom-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
