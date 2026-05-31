<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import VehicleCard from '../components/VehicleCard.vue'
import { useSeoMeta, makeCollectionSchema } from '../composables/useSeoMeta.js'
import { generateSlug } from '../utils/slug.js'
import { useI18n } from '../i18n/index.js'

const route = useRoute()
const { t } = useI18n()
const router = useRouter()

const vehicles = ref([])
const loading = ref(true)
const loadError = ref('')

const search = ref(route.query.search || '')
const manufacturerFilter = ref(route.query.manufacturer || '')
const drivetrainFilter = ref(route.query.drivetrain || '')
const classFilter = ref(route.query.class || '')

// ── Pagination ──
const PAGE_SIZE = 50
const visibleCount = ref(PAGE_SIZE)

const visibleVehicles = computed(() => vehicles.value.slice(0, visibleCount.value))
const hasMoreVehicles = computed(() => visibleCount.value < vehicles.value.length)

function loadMore() {
  visibleCount.value += PAGE_SIZE
}

function resetPagination() {
  visibleCount.value = PAGE_SIZE
}

const manufacturers = computed(() => {
  const set = new Set(vehicles.value.map(v => v.manufacturer).filter(Boolean))
  return [...set].sort()
})

async function fetchVehicles() {
  loading.value = true
  loadError.value = ''

  // ── Attempt 1: Supabase ──
  if (supabase) {
    try {
      let query = supabase.from('vehicles').select('*').order('manufacturer', { ascending: true })

      if (manufacturerFilter.value) query = query.eq('manufacturer', manufacturerFilter.value)
      if (drivetrainFilter.value) query = query.eq('drivetrain', drivetrainFilter.value)
      if (classFilter.value) query = query.eq('class', classFilter.value)
      if (search.value.trim()) {
        const term = `%${search.value.trim()}%`
        query = query.or(`name.ilike.${term},manufacturer.ilike.${term}`)
      }

      const { data, error: fetchError } = await query

      if (!fetchError && data?.length) {
        vehicles.value = data
        resetPagination()
        loading.value = false
        return
      }
    } catch {
      // Supabase unreachable, try fallback
    }
  }

  // ── Attempt 2: local JSON fallback ──
  try {
    const res = await fetch('/data/vehicles.json')
    if (res.ok) {
      const raw = await res.json()
      const list = Array.isArray(raw) ? raw : (raw.vehicles || [])

      vehicles.value = list
        .filter(v => {
          if (search.value.trim()) {
            const q = search.value.toLowerCase()
            const name = (v.name || '').toLowerCase()
            const mfr = (v.manufacturer || '').toLowerCase()
            if (!name.includes(q) && !mfr.includes(q)) return false
          }
          if (manufacturerFilter.value && v.manufacturer !== manufacturerFilter.value) return false
          return true
        })
        .map(v => ({
          slug: v.slug || generateSlug(v.manufacturer, v.name, v.year),
          name: v.name || '',
          manufacturer: v.manufacturer || '',
          year: v.year || null,
          drivetrain: v.drivetrain || null,
          class: v.class || null,
          horsepower: v.horsepower || null,
          weight: v.weight || null,
          image_url: v.image_url || v.thumbnail_url || null,
        }))
        .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer))

      resetPagination()
      loading.value = false
      return
    }
  } catch {
    // local JSON not available
  }

  loadError.value = t('vehicles.failedToLoad')
  loading.value = false
}

function applyFilters() {
  const q = {}
  if (manufacturerFilter.value) q.manufacturer = manufacturerFilter.value
  if (drivetrainFilter.value) q.drivetrain = drivetrainFilter.value
  if (classFilter.value) q.class = classFilter.value
  if (search.value.trim()) q.search = search.value.trim()
  router.replace({ query: Object.keys(q).length > 0 ? q : {} })
  fetchVehicles()
}

function clearFilters() {
  search.value = ''
  manufacturerFilter.value = ''
  drivetrainFilter.value = ''
  classFilter.value = ''
  router.replace({ query: {} })
  fetchVehicles()
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 200)
})

watch([manufacturerFilter, drivetrainFilter, classFilter], () => {
  applyFilters()
})

watch([manufacturerFilter, drivetrainFilter, classFilter, search], () => {
  resetPagination()
})

onMounted(() => {
  useSeoMeta({
    title: 'Vehicle Tuning Database — Forza Tuning Calculator',
    description: 'Browse the complete Forza vehicle tuning database. Find community tunes for every car — Road, Drift, Drag, Dirt. Filter by manufacturer, drivetrain, and class.',
    ogType: 'website',
    jsonLd: makeCollectionSchema('Vehicle Tuning Database', 'Browse the complete Forza vehicle tuning database.', window.location.href),
  })
  fetchVehicles()
})

onBeforeUnmount(() => {})
</script>

<template>
  <div class="vehicles-page">
    <div class="vp-hero">
      <h1 class="vp-title">{{ t('vehicles.title') }}</h1>
      <p class="vp-subtitle">{{ t('vehicles.subtitle') }}</p>
      <p v-if="!loading && vehicles.length > 0" class="vp-count">{{ vehicles.length }} vehicles in database</p>
    </div>

    <!-- Filters -->
    <div class="vp-filters liquid-glass">
      <div class="vp-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="vp-search-icon">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          v-model="search"
          type="text"
          class="vp-search-input"
          :placeholder="t('vehicles.search')"
        />
      </div>

      <select v-model="manufacturerFilter" class="vp-filter-select input-glass">
        <option value="">{{ t('vehicles.allManufacturers') }}</option>
        <option v-for="m in manufacturers" :key="m" :value="m">{{ m }}</option>
      </select>

      <select v-model="drivetrainFilter" class="vp-filter-select input-glass">
        <option value="">{{ t('vehicles.allDrivetrains') }}</option>
        <option value="AWD">AWD</option>
        <option value="RWD">RWD</option>
        <option value="FWD">FWD</option>
      </select>

      <select v-model="classFilter" class="vp-filter-select input-glass">
        <option value="">{{ t('vehicles.allClasses') }}</option>
        <option value="D">D</option>
        <option value="C">C</option>
        <option value="B">B</option>
        <option value="A">A</option>
        <option value="S1">S1</option>
        <option value="S2">S2</option>
        <option value="X">X</option>
      </select>

      <button
        v-if="manufacturerFilter || drivetrainFilter || classFilter || search"
        class="vp-clear-btn"
        @click="clearFilters"
      >
        {{ t('vehicles.clear') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="vp-grid">
      <div v-for="n in PAGE_SIZE" :key="n" class="vp-skeleton liquid-panel">
        <div class="sk-thumb"></div>
        <div class="sk-lines">
          <div class="sk-row sk-short"></div>
          <div class="sk-row sk-med"></div>
          <div class="sk-row sk-long"></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="vp-state">
      <div class="vp-state-card liquid-panel">
        <span class="vp-state-icon">!</span>
        <h2 class="vp-state-title">{{ t('vehicles.failedToLoad') }}</h2>
        <p class="vp-state-desc">{{ loadError }}</p>
        <button class="vp-retry-btn" @click="fetchVehicles">{{ t('vehicles.retry') }}</button>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="vehicles.length === 0" class="vp-state">
      <div class="vp-state-card liquid-panel">
        <span class="vp-state-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </span>
        <h2 class="vp-state-title">{{ t('vehicles.noVehicles') }}</h2>
        <p class="vp-state-desc">{{ t('vehicles.noVehiclesHint') }}</p>
        <button class="vp-retry-btn" @click="clearFilters">{{ t('vehicles.clearFilters') }}</button>
      </div>
    </div>

    <!-- Grid + Load More -->
    <template v-else>
      <div class="vp-grid">
        <VehicleCard v-for="v in visibleVehicles" :key="v.id" :vehicle="v" :tune-count="0" />
      </div>

      <div v-if="hasMoreVehicles" class="vp-load-more">
        <p class="vp-showing">
          Showing {{ visibleVehicles.length }} of {{ vehicles.length }} vehicles
        </p>
        <button
          class="btn-secondary"
          @click="loadMore"
        >
          Load More Vehicles
        </button>
      </div>
      <div v-else class="vp-load-more vp-load-more-end">
        <p class="vp-showing">All {{ vehicles.length }} vehicles loaded</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vehicles-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  padding-top: 48px;
  padding-bottom: 80px;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ── */
.vp-hero {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vp-title {
  font-size: 1.6rem;
  font-weight: 720;
  color: #111827;
  margin: 0;
  letter-spacing: -0.02em;
}

.vp-subtitle {
  font-size: 0.95rem;
  color: #374151;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
}

.vp-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b859e;
  margin: 4px 0 0;
}

/* ── Filters ── */
.vp-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 18px;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}

.vp-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 160px;
}

.vp-search-icon {
  color: #6b7280;
  flex-shrink: 0;
}

.vp-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  color: #111827;
  font-family: inherit;
  outline: none;
}

.vp-search-input::placeholder {
  color: #6b7280;
}

.vp-filter-select {
  padding: 8px 32px 8px 12px;
  min-height: 40px;
  border-radius: 10px;
  font-size: 0.78rem;
  color: #111827;
  font-family: inherit;
  font-weight: 550;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238b95a1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
  flex-shrink: 0;
}

.vp-clear-btn {
  padding: 8px 16px;
  min-height: 40px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #4b5563;
  background: rgba(255, 255, 255, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.38);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  white-space: nowrap;
}

.vp-clear-btn:hover {
  background: rgba(255, 255, 255, 0.40);
  color: #111827;
}

/* ── Grid ── */
.vp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 12px;
}

/* ── Skeleton ── */
.vp-skeleton {
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
}

.sk-thumb {
  width: 80px;
  height: 80px;
  border-radius: 14px;
  background: rgba(200, 210, 225, 0.3);
  flex-shrink: 0;
}

.sk-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  padding-top: 4px;
}

.sk-row {
  height: 10px;
  border-radius: 5px;
  background: rgba(200, 210, 225, 0.35);
}

.sk-short { width: 35%; }
.sk-med   { width: 55%; }
.sk-long   { width: 75%; }

/* ── States ── */
.vp-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 30vh;
}

.vp-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 32px;
  border-radius: 24px;
  text-align: center;
  max-width: 400px;
}

.vp-state-icon {
  color: #4a6b85;
  font-size: 1.5rem;
  font-weight: 700;
}

.vp-state-title {
  font-size: 1.05rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
}

.vp-state-desc {
  font-size: 0.85rem;
  color: #374151;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
}

.vp-retry-btn {
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.40);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  margin-top: 4px;
}

.vp-retry-btn:hover {
  background: rgba(255, 255, 255, 0.40);
  color: #2d4a63;
}

/* ── Load More ── */
.vp-load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-top: 16px;
}

.vp-load-more-end {
  padding-top: 8px;
}

.vp-showing {
  font-size: 0.80rem;
  font-weight: 550;
  color: #4b5563;
  margin: 0;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .vehicles-page {
    padding: 16px;
    padding-top: 28px;
    padding-bottom: 60px;
    gap: 18px;
  }

  .vp-title {
    font-size: 1.25rem;
  }

  .vp-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .vp-filters {
    padding: 12px;
    gap: 8px;
  }

  .vp-search-wrap {
    min-width: 100%;
  }

  .vp-filter-select {
    flex: 1;
    min-width: 0;
  }
}
</style>
