<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { useSeoMeta, makeCollectionSchema } from '../composables/useSeoMeta.js'
import { useI18n } from '../i18n/index.js'

const router = useRouter()
const { t } = useI18n()

const PAGE_SIZE = 24

const tunes = ref([])
const loading = ref(true)
const loadError = ref('')
const loadingMore = ref(false)
const visibleCount = ref(PAGE_SIZE)
const search = ref('')

const visibleTunes = computed(() => tunes.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < tunes.value.length)

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildMetaLabel(t) {
  const parts = []
  if (t.build_type) parts.push(t.build_type)
  if (t.driving_style) parts.push(t.driving_style)
  if (t.drivetrain) parts.push(t.drivetrain)
  if (t.pi_class) parts.push(`PI ${t.pi_class}`)
  return parts
}

async function fetchTunes() {
  loading.value = true
  loadError.value = ''
  tunes.value = []
  visibleCount.value = PAGE_SIZE

  if (!supabase) {
    loadError.value = 'Database not available'
    loading.value = false
    return
  }

  try {
    let query = supabase
      .from('tunes')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (search.value.trim()) {
      const term = `%${search.value.trim()}%`
      query = query.or(`title.ilike.${term},vehicle_name.ilike.${term}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Tunes fetch error:', error.message)
      loadError.value = error.message
      return
    }

    tunes.value = data || []
  } catch (e) {
    console.error('Tunes fetch failed:', e)
    loadError.value = e.message || 'Failed to load tunes'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  loadingMore.value = true
  visibleCount.value += PAGE_SIZE
  // Allow paint before releasing loading state
  requestAnimationFrame(() => {
    loadingMore.value = false
  })
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchTunes, 300)
})

onMounted(() => {
  useSeoMeta({
    title: 'Community Tunes — Forza Tuning Calculator',
    description: 'Browse public Forza tune setups shared by the community. Road, Drift, Dirt, and Drag tunes with full suspension, gearing, and differential specs.',
    ogType: 'website',
    jsonLd: makeCollectionSchema('Community Tunes', 'Browse public Forza tune setups.', window.location.href),
  })
  fetchTunes()
})
</script>

<template>
  <div class="tunes-page">
    <div class="tunes-hero">
      <h1 class="tunes-title">{{ t('tunes.title') }}</h1>
      <p class="tunes-subtitle">{{ t('tunes.subtitle') }}</p>
    </div>

    <!-- Search -->
    <div class="tunes-search-wrap">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="tunes-search-icon">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        v-model="search"
        type="text"
        class="tunes-search-input input-glass"
        placeholder="Search tunes..."
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="tunes-grid">
      <div v-for="n in PAGE_SIZE" :key="n" class="tunes-skeleton liquid-panel">
        <div class="sk-row sk-title"></div>
        <div class="sk-row sk-meta"></div>
        <div class="sk-row sk-date"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="tunes-state">
      <div class="tunes-state-card liquid-panel">
        <span class="tunes-state-icon">!</span>
        <h2 class="tunes-state-title">Unable to load tunes</h2>
        <p class="tunes-state-desc">{{ loadError }}</p>
        <button class="btn-primary" @click="fetchTunes">Retry</button>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="tunes.length === 0" class="tunes-state">
      <div class="tunes-state-card liquid-panel">
        <span class="tunes-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </span>
        <h2 class="tunes-state-title">No public tunes yet</h2>
        <p class="tunes-state-desc">Create and publish your first tune.</p>
        <button class="btn-primary" @click="router.push('/calculator')">Start Tuning</button>
      </div>
    </div>

    <!-- Grid + Load More -->
    <template v-else>
      <div class="tunes-grid">
        <router-link
          v-for="tune in visibleTunes"
          :key="tune.id"
          :to="`/tunes/${tune.slug || tune.id}`"
          class="tune-card liquid-card"
        >
          <!-- Top row: share code + date -->
          <div class="tc-top-row">
            <span v-if="tune.share_code" class="tc-share-code-pill">{{ tune.share_code }}</span>
            <span class="tc-date">{{ formatDate(tune.created_at) }}</span>
          </div>
          <h3 class="tc-title">{{ tune.title || 'Untitled' }}</h3>
          <span v-if="tune.vehicle_name" class="tc-vehicle">{{ tune.vehicle_name }}</span>
          <!-- Game mode + meta tags -->
          <div class="tc-meta-row">
            <span v-if="tune.game_mode" class="tc-game-mode-tag">{{ tune.game_mode }}</span>
            <span v-if="tune.drivetrain" class="tc-meta-tag">{{ tune.drivetrain }}</span>
            <span v-if="tune.class_tier || tune.pi_class" class="tc-meta-tag">{{ tune.class_tier || tune.pi_class }}</span>
          </div>
          <!-- Description excerpt -->
          <p v-if="tune.description" class="tc-desc">{{ tune.description.slice(0, 120) }}{{ tune.description.length > 120 ? '...' : '' }}</p>
          <!-- User tags -->
          <div v-if="tune.tags" class="tc-tags-row">
            <span v-for="tag in tune.tags.split(',').slice(0, 5)" :key="tag" class="tc-user-tag">{{ tag.trim() }}</span>
          </div>
        </router-link>
      </div>

      <div v-if="hasMore" class="tunes-more">
        <button class="btn-secondary" :disabled="loadingMore" @click="loadMore">
          Load More
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tunes-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 80px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ── */
.tunes-hero {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tunes-title {
  font-size: 1.5rem;
  font-weight: 720;
  color: #000000;
  margin: 0;
  letter-spacing: -0.02em;
}

.tunes-subtitle {
  font-size: 0.9rem;
  color: #111111;
  font-weight: 500;
  margin: 0;
}

/* ── Search ── */
.tunes-search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px) saturate(145%);
  -webkit-backdrop-filter: blur(12px) saturate(145%);
  border: 1px solid rgba(255, 255, 255, 0.50);
}

.tunes-search-icon {
  color: #222222;
  flex-shrink: 0;
}

.tunes-search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 0.85rem;
  color: #000000;
  font-family: inherit;
  outline: none;
  padding: 0;
}

.tunes-search-input::placeholder {
  color: #333333;
}

/* ── Grid ── */
.tunes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

/* ── Card ── */
.tune-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  border-radius: 18px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  cursor: pointer;
}

.tune-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.07), 0 0 0 1px rgba(255, 255, 255, 0.45);
}

.tc-title {
  font-size: 0.9rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
  line-height: 1.25;
}

.tc-vehicle {
  font-size: 0.8rem;
  font-weight: 550;
  color: #4a6b85;
}

.tc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tc-tag {
  padding: 2px 9px;
  border-radius: 8px;
  font-size: 0.62rem;
  font-weight: 600;
  color: #222222;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.tc-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tc-share-code-pill {
  font-size: 0.66rem;
  font-weight: 640;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  color: #3d648c;
  background: rgba(74, 107, 133, 0.07);
  border: 1px solid rgba(91, 122, 154, 0.20);
  padding: 2px 10px;
  border-radius: 6px;
}

.tc-date {
  font-size: 0.68rem;
  font-weight: 500;
  color: #6b7280;
}

.tc-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tc-game-mode-tag {
  font-size: 0.62rem;
  font-weight: 640;
  color: #374151;
  padding: 2px 9px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.tc-meta-tag {
  font-size: 0.60rem;
  font-weight: 580;
  color: #4B5563;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.tc-desc {
  font-size: 0.74rem;
  line-height: 1.50;
  color: #4B5563;
  font-weight: 500;
  margin: 0;
}

.tc-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tc-user-tag {
  font-size: 0.60rem;
  font-weight: 580;
  color: #5b7a9a;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(91, 122, 154, 0.06);
  border: 1px solid rgba(91, 122, 154, 0.12);
}

/* ── Skeleton ── */
.tunes-skeleton {
  padding: 18px 20px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sk-row {
  height: 11px;
  border-radius: 6px;
  background: rgba(200, 210, 225, 0.35);
}

.sk-title { width: 55%; }
.sk-meta  { width: 80%; }
.sk-date  { width: 30%; }

/* ── States ── */
.tunes-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}

.tunes-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 44px 36px;
  border-radius: 24px;
  text-align: center;
  max-width: 420px;
}

.tunes-state-icon {
  color: #4a6b85;
}

.tunes-state-title {
  font-size: 1.1rem;
  font-weight: 680;
  color: #000000;
  margin: 0;
}

.tunes-state-desc {
  font-size: 0.85rem;
  color: #111111;
  font-weight: 500;
  margin: 0;
  line-height: 1.55;
}

/* ── Load More ── */
.tunes-more {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

@media (max-width: 640px) {
  .tunes-page {
    padding: 16px;
    padding-top: 28px;
    padding-bottom: 60px;
    gap: 18px;
  }

  .tunes-title {
    font-size: 1.25rem;
  }

  .tunes-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tunes-state-card {
    padding: 36px 24px;
  }
}
</style>
