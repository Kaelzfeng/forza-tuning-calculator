<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'
import TuneCard from '../components/TuneCard.vue'
import { useSeoMeta, makeCollectionSchema } from '../composables/useSeoMeta.js'
import { useI18n } from '../i18n/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useProAccess } from '../composables/useProAccess.js'

const PAGE_SIZE = 12
const { t } = useI18n()
const { user } = useAuth()
const { isPro } = useProAccess()
const tableName = computed(() => isPro.value ? 'tunes' : 'tunes_public')

const tunes = ref([])
const loading = ref(true)
const loadError = ref('')
const loadingMore = ref(false)
const hasMore = ref(true)
const lastCursor = ref(null)

async function fetchTunes(reset) {
  if (reset) {
    loading.value = true
    tunes.value = []
    hasMore.value = true
    lastCursor.value = null
  }

  loadError.value = ''

  if (!supabase) {
    loadError.value = t('tunes.failedToLoad')
    loading.value = false
    return
  }

  try {
    let query = supabase
      .from(tableName.value)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (!reset && lastCursor.value) {
      query = query.lt('created_at', lastCursor.value)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch tunes:', fetchError)
      loadError.value = fetchError.message
      loading.value = false
      return
    }

    hasMore.value = data.length > PAGE_SIZE
    const items = data.slice(0, PAGE_SIZE)

    if (reset) {
      tunes.value = items
    } else {
      tunes.value = [...tunes.value, ...items]
    }

    if (items.length > 0) {
      lastCursor.value = items[items.length - 1].created_at
    }
  } catch (e) {
    console.error('Failed to fetch tunes:', e)
    loadError.value = e.message || t('tunes.failedToLoad')
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  loadingMore.value = true
  fetchTunes(false)
}

function handlePublish() {
  window.location.href = '/calculator'
}

onMounted(() => {
  useSeoMeta({
    title: 'Community Tunes — Forza Tuning Calculator',
    description: 'Browse published Forza tuning setups from the community. Road, Drift, Dirt, and Drag tunes with full suspension, gearing, and differential specs.',
    ogType: 'website',
    jsonLd: makeCollectionSchema('Community Tunes', 'Browse published Forza tuning setups from the community.', window.location.href),
  })
  fetchTunes(true)
})
</script>

<template>
  <div class="feed">
    <div class="feed-hero">
      <div class="feed-hero-top">
        <h1 class="feed-title">{{ t('tunes.title') }}</h1>
        <button class="feed-publish-btn liquid-glass" @click="handlePublish">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {{ t('tunes.publishTune') }}
        </button>
      </div>
      <p class="feed-subtitle">{{ t('tunes.subtitle') }}</p>
    </div>

    <!-- ── Loading ── -->
    <div v-if="loading" class="feed-grid">
      <div v-for="n in 6" :key="n" class="feed-skeleton liquid-panel">
        <div class="sk-row sk-short"></div>
        <div class="sk-row sk-long"></div>
        <div class="sk-row sk-med"></div>
        <div class="sk-row sk-short"></div>
      </div>
    </div>

    <!-- ── Error ── -->
    <div v-else-if="loadError" class="feed-state">
      <div class="feed-state-card liquid-panel">
        <span class="feed-state-icon">!</span>
        <h2 class="feed-state-title">{{ t('tunes.failedToLoad') }}</h2>
        <p class="feed-state-desc">{{ loadError }}</p>
        <button class="feed-retry-btn" @click="fetchTunes(true)">{{ t('tunes.retry') }}</button>
      </div>
    </div>

    <!-- ── Empty ── -->
    <div v-else-if="tunes.length === 0" class="feed-state">
      <div class="feed-state-card liquid-panel">
        <span class="feed-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </span>
        <h2 class="feed-state-title">{{ t('tunes.noTunes') }}</h2>
        <p class="feed-state-desc">{{ t('tunes.noTunesDesc') }}</p>
        <router-link to="/calculator" class="feed-cta btn-glass">{{ t('tunes.openCalculator') }}</router-link>
      </div>
    </div>

    <!-- ── Grid ── -->
    <template v-else>
      <div class="feed-grid">
        <TuneCard v-for="tune in tunes" :key="tune.id" :tune="tune" />
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="feed-more">
        <button class="feed-more-btn liquid-glass" :disabled="loadingMore" @click="loadMore">
          <svg v-if="loadingMore" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="feed-spinner">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          {{ loadingMore ? t('tunes.loading') : t('tunes.loadMore') }}
        </button>
      </div>

      <div v-else-if="tunes.length > 0" class="feed-end">
        <span class="feed-end-text">{{ t('tunes.reachedEnd') }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 80px;
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ── */
.feed-hero {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feed-hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.feed-title {
  font-size: 1.5rem;
  font-weight: 720;
  color: #111111;
  margin: 0;
  letter-spacing: -0.02em;
}

.feed-publish-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 20px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-family: inherit;
  flex-shrink: 0;
}

.feed-publish-btn:hover {
  color: #2d4a63;
  transform: translateY(-1px);
}

.feed-subtitle {
  font-size: 0.9rem;
  color: #222222;
  font-weight: 500;
  margin: 0;
}

/* ── Grid ── */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

/* ── Skeleton ── */
.feed-skeleton {
  padding: 20px 22px;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk-row {
  height: 12px;
  border-radius: 6px;
  background: rgba(200, 210, 225, 0.35);
}

.sk-short { width: 40%; }
.sk-med   { width: 65%; }
.sk-long   { width: 90%; }

/* ── States ── */
.feed-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
}

.feed-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 44px 36px;
  border-radius: 24px;
  text-align: center;
  max-width: 420px;
}

.feed-state-icon {
  color: #4a6b85;
}

.feed-state-title {
  font-size: 1.1rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
}

.feed-state-desc {
  font-size: 0.85rem;
  color: #222222;
  font-weight: 500;
  margin: 0;
  line-height: 1.55;
}

.feed-cta {
  padding: 12px 28px;
  border-radius: 12px;
  font-size: 0.85rem;
  text-decoration: none;
  margin-top: 4px;
}

.feed-retry-btn {
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  background: #fff;
  border: 1px solid rgba(255, 255, 255, 0.38);
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.feed-retry-btn:hover {
  background: #fff;
  color: #2d4a63;
}

/* ── Load More ── */
.feed-more {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.feed-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 32px;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 620;
  color: #4a6b85;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.feed-more-btn:hover:not(:disabled) {
  color: #2d4a63;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.20));
  transform: translateY(-1px);
}

.feed-more-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.feed-spinner {
  animation: feed-spin 0.9s linear infinite;
}

@keyframes feed-spin {
  to { transform: rotate(360deg); }
}

/* ── End ── */
.feed-end {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.feed-end-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: #333333;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .feed {
    padding: 16px;
    padding-top: 28px;
    padding-bottom: 60px;
    gap: 24px;
  }

  .feed-title {
    font-size: 1.25rem;
  }

  .feed-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .tune-card {
    padding: 16px 18px;
    border-radius: 16px;
  }

  .feed-state-card {
    padding: 36px 24px;
  }
}
</style>
