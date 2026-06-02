<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import VehicleCard from '../components/VehicleCard.vue'
import { useSeoMeta, makeItemListSchema, makeBreadcrumbSchema } from '../composables/useSeoMeta.js'
import { generateSlug } from '../utils/slug.js'
import { useI18n } from '../i18n/index.js'

const route = useRoute()
const { t } = useI18n()

// ── Ranking type from route meta ──
const rankingType = computed(() => route.meta?.ranking || 'awd')

// ── Ranking configs ──
const RANKING_CONFIGS = {
  awd: {
    i18nKey: 'awd',
    seoTitle: 'Best AWD Cars for Forza Tuning',
    seoDescription: 'Top AWD vehicles ranked by horsepower. Find the best all-wheel-drive cars for Road, Drift, Dirt and Drag tuning setups.',
    itemListName: 'Best AWD Cars',
    supabaseQuery: (q) => q.eq('drivetrain', 'AWD').order('horsepower', { ascending: false }).limit(12),
    localFilter: (list) => list.filter(v => v.drivetrain === 'AWD').sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0)).slice(0, 12),
  },
  drift: {
    i18nKey: 'drift',
    seoTitle: 'Best Drift Cars for Forza Tuning',
    seoDescription: 'Top RWD drift cars ranked by horsepower. Ideal platforms for high-angle drift builds and controlled oversteer setups.',
    itemListName: 'Best Drift Cars',
    supabaseQuery: (q) => q.eq('drivetrain', 'RWD').order('horsepower', { ascending: false }).limit(12),
    localFilter: (list) => list.filter(v => v.drivetrain === 'RWD').sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0)).slice(0, 12),
  },
  beginner: {
    i18nKey: 'beginner',
    seoTitle: 'Best Beginner Cars for Forza Tuning',
    seoDescription: 'Beginner-friendly cars with manageable horsepower and stable AWD/FWD drivetrains. Perfect for learning tuning fundamentals.',
    itemListName: 'Best Beginner Cars',
    supabaseQuery: (q) => q.in('class', ['B', 'A']).lte('horsepower', 500).order('horsepower', { ascending: false }).limit(24),
    localFilter: (list) => {
      const filtered = list.filter(v => ['B', 'A'].includes(v.class) && v.horsepower != null && v.horsepower <= 500)
      const stable = filtered.filter(v => v.drivetrain === 'AWD' || v.drivetrain === 'FWD').sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0))
      const rest = filtered.filter(v => !['AWD', 'FWD'].includes(v.drivetrain)).sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0))
      return [...stable, ...rest].slice(0, 12)
    },
  },
  s1: {
    i18nKey: 's1',
    seoTitle: 'Best S1 Class Cars for Forza Tuning',
    seoDescription: 'Top S1 class vehicles ranked by horsepower. High-performance cars for competitive Forza tuning and racing.',
    itemListName: 'Best S1 Class Cars',
    supabaseQuery: (q) => q.eq('class', 'S1').order('horsepower', { ascending: false }).limit(12),
    localFilter: (list) => list.filter(v => v.class === 'S1').sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0)).slice(0, 12),
  },
}

const config = computed(() => RANKING_CONFIGS[rankingType.value] || RANKING_CONFIGS.awd)

// ── Data ──
const vehicles = ref([])
const loading = ref(true)
const loadError = ref('')

// ── SEO ──
useSeoMeta({
  title: computed(() => config.value.seoTitle),
  description: computed(() => config.value.seoDescription),
  ogType: 'website',
  jsonLd: computed(() => [
    makeItemListSchema(
      config.value.itemListName,
      config.value.seoDescription,
      vehicles.value.map(v => ({
        name: `${v.manufacturer} ${v.name}`,
        url: `${window.location.origin}/vehicles/${v.slug}`,
        image: v.image_url || v.thumbnail_url || undefined,
      })),
      vehicles.value.length || 12,
    ),
    makeBreadcrumbSchema([
      { name: 'Home', url: window.location.origin },
      { name: config.value.itemListName, url: window.location.href },
    ]),
  ]),
})

// ── Local JSON fallback ──
async function fetchLocalJSON(filterFn) {
  try {
    const res = await fetch('/data/vehicles.json')
    if (!res.ok) return null
    const raw = await res.json()
    const list = Array.isArray(raw) ? raw : (raw.vehicles || [])
    const filtered = filterFn(list)
    return filtered.map(v => ({
      ...v,
      slug: v.slug || generateSlug(v.manufacturer, v.name, v.year),
    }))
  } catch {
    return null
  }
}

async function fetchVehicles() {
  loading.value = true
  loadError.value = ''

  // Attempt 1: Supabase
  if (supabase) {
    try {
      let query = supabase.from('vehicles').select('*')
      query = config.value.supabaseQuery(query)
      const { data, error } = await query

      if (!error && data && data.length > 0) {
        // For beginner, apply client-side AWD/FWD priority sort
        if (rankingType.value === 'beginner') {
          const stable = data.filter(v => v.drivetrain === 'AWD' || v.drivetrain === 'FWD').sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0))
          const rest = data.filter(v => !['AWD', 'FWD'].includes(v.drivetrain)).sort((a, b) => (b.horsepower || 0) - (a.horsepower || 0))
          vehicles.value = [...stable, ...rest].slice(0, 12)
        } else {
          vehicles.value = data.slice(0, 12)
        }
        loading.value = false
        return
      }
    } catch {
      // Supabase unreachable, fall through to local JSON
    }
  }

  // Attempt 2: Local JSON fallback
  const localData = await fetchLocalJSON(config.value.localFilter)
  if (localData && localData.length > 0) {
    vehicles.value = localData
    loading.value = false
    return
  }

  loadError.value = 'Failed to load vehicles.'
  loading.value = false
}

onMounted(() => {
  fetchVehicles()
})

// ── Helpers ──
const rankingTitle = computed(() => t(`rankings.${config.value.i18nKey}.title`, config.value.seoTitle))
const rankingSubtitle = computed(() => t(`rankings.${config.value.i18nKey}.subtitle`, ''))
const rankingIntro = computed(() => t(`rankings.${config.value.i18nKey}.intro`, ''))
</script>

<template>
  <div class="ranking-page">

    <!-- ═══════════ Hero ═══════════ -->
    <section class="ranking-hero liquid-panel">
      <h1 class="ranking-title">{{ rankingTitle }}</h1>
      <p v-if="rankingSubtitle" class="ranking-subtitle">{{ rankingSubtitle }}</p>
      <p v-if="rankingIntro" class="ranking-intro">{{ rankingIntro }}</p>
    </section>

    <!-- ═══════════ Vehicle Grid ═══════════ -->
    <section class="ranking-section">
      <!-- Loading -->
      <div v-if="loading" class="ranking-state liquid-panel">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="ranking-spinner">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span class="ranking-state-text">Loading vehicles...</span>
      </div>

      <!-- Error -->
      <div v-else-if="loadError" class="ranking-state liquid-panel">
        <span class="ranking-state-text">{{ loadError }}</span>
        <button class="ranking-retry btn-glass" @click="fetchVehicles">Retry</button>
      </div>

      <!-- Empty -->
      <div v-else-if="vehicles.length === 0" class="ranking-state liquid-panel">
        <span class="ranking-state-text">No vehicles found.</span>
      </div>

      <!-- Grid -->
      <div v-else class="ranking-grid">
        <VehicleCard v-for="v in vehicles" :key="v.id || v.slug" :vehicle="v" />
      </div>
    </section>

  </div>
</template>

<style scoped>
.ranking-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
}

/* ═══════════ Hero ═══════════ */
.ranking-hero {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 44px 40px;
  border-radius: 24px;
}

.ranking-title {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 720;
  color: #000000;
  margin: 0;
  line-height: 1.15;
  letter-spacing: -0.02em;
  position: relative;
  z-index: 2;
}

.ranking-subtitle {
  font-size: 1rem;
  font-weight: 600;
  color: #000000;
  margin: 0;
  line-height: 1.45;
  position: relative;
  z-index: 2;
}

.ranking-intro {
  font-size: 0.88rem;
  line-height: 1.7;
  color: #111111;
  margin: 0;
  font-weight: 500;
  max-width: 680px;
  position: relative;
  z-index: 2;
}

/* ═══════════ Section ═══════════ */
.ranking-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── State ── */
.ranking-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 44px 24px;
  border-radius: 20px;
  text-align: center;
}

.ranking-state-text {
  font-size: 0.9rem;
  font-weight: 550;
  color: #4a6b85;
}

.ranking-spinner {
  animation: rk-spin 0.9s linear infinite;
  color: #4a6b85;
}

@keyframes rk-spin {
  to { transform: rotate(360deg); }
}

.ranking-retry {
  font-size: 0.84rem;
  padding: 0 22px;
  font-weight: 620;
}

/* ── Grid ── */
.ranking-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}

/* ═══════════ Mobile ═══════════ */
@media (max-width: 640px) {
  .ranking-page {
    padding: 16px;
    padding-top: 24px;
    padding-bottom: 60px;
    gap: 24px;
  }

  .ranking-hero {
    padding: 32px 22px;
    border-radius: 20px;
    gap: 10px;
  }

  .ranking-title {
    font-size: clamp(1.3rem, 6vw, 1.8rem);
  }

  .ranking-subtitle {
    font-size: 0.88rem;
  }

  .ranking-intro {
    font-size: 0.82rem;
  }

  .ranking-grid {
    grid-template-columns: 1fr;
  }

  .ranking-state {
    padding: 36px 20px;
    border-radius: 18px;
  }
}
</style>
