<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import VehicleCard from '../components/VehicleCard.vue'
import TuneCard from '../components/TuneCard.vue'
import { useSeoMeta, makeVehicleSchema, makeBreadcrumbSchema } from '../composables/useSeoMeta.js'
import { generateSlug } from '../utils/slug.js'
import { useAuth } from '../composables/useAuth.js'
import { useProAccess } from '../composables/useProAccess.js'
import { useFavorites } from '../composables/useFavorites.js'
import { useComments } from '../composables/useComments.js'
import { useI18n } from '../i18n/index.js'
import SubscriptionModal from '../components/SubscriptionModal.vue'

const route = useRoute()
const { user } = useAuth()
const { isPro } = useProAccess()
const tableName = computed(() => isPro.value ? 'tunes' : 'tunes_public')
const { isFavorite, toggleFavorite } = useFavorites()
const { comments, loading: commentsLoading, fetchComments, addComment, deleteComment, anonymizeEmail } = useComments()
const { t } = useI18n()

const showProModal = ref(false)
const proModalReason = ref('')
function openProModal(reason) { proModalReason.value = reason; showProModal.value = true }
function closeProModal() { showProModal.value = false }

const vehicle = ref(null)
const tunes = ref([])
const tunesLoading = ref(false)
const tunesError = ref('')
const relatedVehicles = ref([])
const relatedVehiclesLoading = ref(false)
const relatedTunes = ref([])
const relatedTunesLoading = ref(false)
const popularTunes = ref([])
const popularTunesLoading = ref(false)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')

const slug = computed(() => route.params.slug)

// ── SEO helper ──
function applySeo(vData) {
  const autoTitle = vData.meta_title || `${vData.name} Tuning Guide — Forza Tuning Calculator`
  const autoDesc = vData.meta_description || vData.description
    ? (vData.description || '').slice(0, 160)
    : `View specs, drivetrain, class, and tuning information for ${vData.name}.`

  useSeoMeta({
    title: autoTitle,
    description: autoDesc,
    ogType: 'article',
    jsonLd: makeVehicleSchema(vData),
    canonical: `${window.location.origin}/vehicles/${vData.slug}`,
  })
}

// ── Local JSON fallback ──
async function findInLocalJson(targetSlug) {
  try {
    const res = await fetch('/data/vehicles.json')
    if (!res.ok) return null
    const raw = await res.json()
    const vehicles = Array.isArray(raw) ? raw : (raw.vehicles || [])

    for (const v of vehicles) {
      const candidate = v.slug || generateSlug(v.manufacturer, v.name, v.year)
      if (candidate === targetSlug) {
        return {
          id: candidate,
          slug: candidate,
          name: v.name || '',
          manufacturer: v.manufacturer || '',
          year: v.year || null,
          drivetrain: v.drivetrain || null,
          class: v.class || null,
          horsepower: v.horsepower || null,
          weight: v.weight || null,
          image_url: v.image_url || v.thumbnail_url || null,
          description: v.description || '',
        }
      }
    }
  } catch {
    // local JSON not available
  }
  return null
}

async function fetchVehicle() {
  loading.value = true
  notFound.value = false
  loadError.value = ''

  // ── Attempt 1: Supabase ──
  if (supabase) {
    try {
      const { data: vData, error: vError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('slug', slug.value)
        .single()

      if (!vError && vData) {
        vehicle.value = vData

        // Fetch tunes
        tunesLoading.value = true
        tunesError.value = ''
        const { data: tData, error: tError } = await supabase
          .from(tableName.value)
          .select('*')
          .eq('vehicle_id', vData.id)
          .order('created_at', { ascending: false })

        if (tError) { tunesError.value = tError.message }
        else { tunes.value = tData || [] }
        tunesLoading.value = false

        // Related content
        fetchAllRelated()

        applySeo(vData)
        fetchComments(vData.id)
        loading.value = false
        return
      }
    } catch {
      // Supabase unreachable, try fallback
    }
  }

  // ── Attempt 2: local JSON fallback ──
  const localVehicle = await findInLocalJson(slug.value)
  if (localVehicle) {
    vehicle.value = localVehicle
    applySeo(localVehicle)
    loading.value = false
    return
  }

  // Both failed
  notFound.value = true
  loading.value = false
}

async function fetchSimilarVehicles() {
  if (!supabase || !vehicle.value) return
  relatedVehiclesLoading.value = true
  try {
    const v = vehicle.value
    let result = []

    if (v.manufacturer) {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('manufacturer', v.manufacturer)
        .neq('id', v.id)
        .order('year', { ascending: false })
        .limit(6)
      result = data || []
    }

    if (result.length < 6 && v.class) {
      const skipIds = new Set([v.id, ...result.map(x => x.id)])
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('class', v.class)
        .order('year', { ascending: false })
        .limit(10)
      const extra = (data || []).filter(x => !skipIds.has(x.id))
      result = [...result, ...extra].slice(0, 6)
    }

    relatedVehicles.value = result
  } catch {
    relatedVehicles.value = []
  } finally {
    relatedVehiclesLoading.value = false
  }
}

async function fetchRelatedTunes() {
  if (!supabase || !vehicle.value) return
  relatedTunesLoading.value = true
  try {
    const v = vehicle.value
    const existingIds = new Set(tunes.value.map(t => t.id))
    let result = []

    // 1. Same vehicle_id (exclude already shown Community Tunes)
    if (result.length < 6) {
      const { data } = await supabase
        .from('tunes_public')
        .select('*')
        .eq('vehicle_id', v.id)
        .order('created_at', { ascending: false })
        .limit(6)
      const fresh = (data || []).filter(t => !existingIds.has(t.id))
      result = fresh.slice(0, 6)
    }

    // 2. Same manufacturer
    if (result.length < 6 && v.manufacturer) {
      const { data: mfrVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('manufacturer', v.manufacturer)
        .neq('id', v.id)
        .limit(10)
      const mfrIds = (mfrVehicles || []).map(x => x.id)
      if (mfrIds.length > 0) {
        const skipIds = new Set([...existingIds, ...result.map(t => t.id)])
        const { data: mfrTunes } = await supabase
          .from('tunes_public')
          .select('*')
          .in('vehicle_id', mfrIds)
          .order('created_at', { ascending: false })
          .limit(6)
        const extra = (mfrTunes || []).filter(t => !skipIds.has(t.id))
        result = [...result, ...extra].slice(0, 6)
      }
    }

    // 3. Same class
    if (result.length < 6 && v.class) {
      const { data: clsVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('class', v.class)
        .neq('id', v.id)
        .neq('manufacturer', v.manufacturer)
        .limit(10)
      const clsIds = (clsVehicles || []).map(x => x.id)
      if (clsIds.length > 0) {
        const skipIds = new Set([...existingIds, ...result.map(t => t.id)])
        const { data: clsTunes } = await supabase
          .from('tunes_public')
          .select('*')
          .in('vehicle_id', clsIds)
          .order('created_at', { ascending: false })
          .limit(6)
        const extra = (clsTunes || []).filter(t => !skipIds.has(t.id))
        result = [...result, ...extra].slice(0, 6)
      }
    }

    relatedTunes.value = result
  } catch {
    relatedTunes.value = []
  } finally {
    relatedTunesLoading.value = false
  }
}

async function fetchPopularTunes() {
  if (!supabase) return
  popularTunesLoading.value = true
  try {
    const { data } = await supabase
      .from('tunes_public')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)
    popularTunes.value = data || []
  } catch {
    popularTunes.value = []
  } finally {
    popularTunesLoading.value = false
  }
}

async function fetchAllRelated() {
  await Promise.all([
    fetchSimilarVehicles(),
    fetchRelatedTunes(),
    fetchPopularTunes(),
  ])
}

const favToggling = ref(false)

async function handleToggleFavorite() {
  if (!vehicle.value?.id) return
  favToggling.value = true
  try {
    await toggleFavorite(vehicle.value.id)
  } catch {
    // Login required or network error — silently ignored
  } finally {
    favToggling.value = false
  }
}

// ── Comments ──
const newComment = ref('')
const commentError = ref('')
const commentSending = ref(false)

async function handlePostComment() {
  if (!vehicle.value?.id) return
  commentError.value = ''
  commentSending.value = true
  try {
    await addComment(vehicle.value.id, newComment.value)
    newComment.value = ''
  } catch (e) {
    commentError.value = e.message || 'Failed to post comment.'
  } finally {
    commentSending.value = false
  }
}

async function handleDeleteComment(commentId) {
  await deleteComment(commentId)
}

fetchVehicle()
watch(slug, () => { fetchVehicle() })
</script>

<template>
  <div class="vd-page">
    <!-- ── Loading ── -->
    <div v-if="loading" class="vd-state">
      <div class="vd-state-card liquid-panel">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="vd-spinner">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span class="vd-state-text">Loading vehicle...</span>
      </div>
    </div>

    <!-- ── 404 ── -->
    <div v-else-if="notFound" class="vd-state">
      <div class="vd-state-card liquid-panel">
        <span class="vd-state-icon">404</span>
        <h2 class="vd-state-title">Vehicle Not Found</h2>
        <p class="vd-state-desc">This vehicle may not be in our database yet.</p>
        <router-link to="/vehicles" class="vd-back-link">Browse Vehicles</router-link>
      </div>
    </div>

    <!-- ── Error ── -->
    <div v-else-if="loadError" class="vd-state">
      <div class="vd-state-card liquid-panel">
        <span class="vd-state-icon">!</span>
        <h2 class="vd-state-title">Failed to Load</h2>
        <p class="vd-state-desc">{{ loadError }}</p>
        <button class="vd-back-link" @click="fetchVehicle">Retry</button>
      </div>
    </div>

    <template v-else-if="vehicle">
      <!-- Back -->
      <router-link to="/vehicles" class="vd-back liquid-glass">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        {{ t('nav.vehicles') }}
      </router-link>

      <!-- ═══════════ Hero ═══════════ -->
      <div class="vd-hero liquid-panel">
        <div class="vd-hero-layout">
          <div v-if="vehicle.image_url" class="vd-hero-img-wrap">
            <img
              :src="vehicle.image_url"
              :alt="vehicle.name"
              class="vd-hero-img"
            />
          </div>
          <div class="vd-hero-body">
            <span class="vd-hero-manufacturer">{{ vehicle.manufacturer }}</span>
            <h1 class="vd-hero-name">{{ vehicle.name }}</h1>

            <!-- Info Bar: Year · Country · Drivetrain · Class -->
            <div class="vd-hero-infobar">
              <span v-if="vehicle.year" class="vd-info-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ vehicle.year }}
              </span>
              <span v-if="vehicle.country && vehicle.year" class="vd-info-divider">·</span>
              <span v-if="vehicle.country" class="vd-info-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                {{ vehicle.country }}
              </span>
              <span v-if="vehicle.drivetrain && (vehicle.country || vehicle.year)" class="vd-info-divider">·</span>
              <span v-if="vehicle.drivetrain" class="vd-info-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                {{ vehicle.drivetrain }}
              </span>
            </div>

            <!-- Favorite Button -->
            <div class="vd-hero-actions">
              <!-- Not logged in → CTA panel -->
              <div v-if="!user" class="vd-fav-cta">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {{ t('vehicle.loginToSaveFavorites') }}
              </div>
              <!-- Favorited -->
              <button
                v-else-if="isFavorite(vehicle.id)"
                class="vd-fav-btn vd-fav-saved"
                :disabled="favToggling"
                @click="handleToggleFavorite"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {{ t('vehicle.saved') }}
              </button>
              <!-- Not favorited -->
              <button
                v-else
                class="vd-fav-btn vd-fav-save"
                :disabled="favToggling"
                @click="handleToggleFavorite"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {{ t('vehicle.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ Stats Cards ═══════════ -->
      <section class="vd-section">
        <h2 class="vd-section-title">{{ t('vehicle.statsTitle') }}</h2>
        <div class="vd-stats-grid">
          <div class="vd-stat-card glass-card-soft" v-if="vehicle.horsepower">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span class="vd-stat-value">{{ vehicle.horsepower }}</span>
            <span class="vd-stat-label">{{ t('vehicle.horsepower') }}</span>
          </div>
          <div class="vd-stat-card glass-card-soft" v-if="vehicle.weight">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <line x1="16" y1="8" x2="8" y2="8" /><line x1="16" y1="12" x2="8" y2="12" /><rect x="3" y="2" width="18" height="20" rx="3" ry="3" /><line x1="12" y1="16" x2="12" y2="20" />
            </svg>
            <span class="vd-stat-value">{{ vehicle.weight }}</span>
            <span class="vd-stat-label">{{ t('vehicle.weight') }} (kg)</span>
          </div>
          <div class="vd-stat-card glass-card-soft" v-if="vehicle.drivetrain">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            <span class="vd-stat-value vd-stat-drivetrain">{{ vehicle.drivetrain }}</span>
            <span class="vd-stat-label">{{ t('vehicle.drivetrain') }}</span>
          </div>
          <div class="vd-stat-card glass-card-soft" v-if="vehicle.class">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span class="vd-stat-value vd-stat-class">{{ vehicle.class }}</span>
            <span class="vd-stat-label">{{ t('vehicle.vehicleClass') }}</span>
          </div>
        </div>
      </section>

      <!-- ═══════════ Community Tunes ═══════════ -->
      <section class="vd-section">
        <h2 class="vd-section-title">{{ t('vehicle.communityTunes') }}</h2>

        <div v-if="tunesLoading" class="vd-empty liquid-panel">
          <span class="vd-empty-text">{{ t('vehicle.loadingTunes') }}</span>
        </div>

        <div v-else-if="tunesError" class="vd-empty liquid-panel">
          <span class="vd-empty-text">{{ t('vehicle.failedTunes') }}</span>
        </div>

        <div v-else-if="tunes.length > 0" class="vd-tunes-grid">
          <TuneCard v-for="t in tunes" :key="t.id" :tune="t" />
        </div>

        <div v-else class="vd-empty liquid-panel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          <span class="vd-empty-text">{{ t('vehicle.noTunes') }}</span>
          <router-link to="/calculator" class="vd-empty-cta">{{ t('vehicle.createTune') }}</router-link>
        </div>
      </section>

      <!-- ═══════════ Related Tunes ═══════════ -->
      <section v-if="relatedTunes.length > 0" class="vd-section">
        <h2 class="vd-section-title">Related Tunes</h2>
        <div v-if="relatedTunesLoading" class="vd-empty glass-card-white">
          <span class="vd-empty-text">Loading related tunes...</span>
        </div>
        <div v-else class="vd-tunes-grid">
          <TuneCard v-for="t in relatedTunes" :key="t.id" :tune="t" />
        </div>
      </section>

      <!-- ═══════════ Comments ═══════════ -->
      <section v-if="vehicle.id" class="vd-section">
        <h2 class="vd-section-title">{{ t('vehicle.comments') }}</h2>

        <!-- Not logged in → prominent CTA panel -->
        <div v-if="!user" class="vc-login-cta liquid-panel">
          <div class="vc-login-cta-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>{{ t('vehicle.loginToComment') }}</span>
          </div>
        </div>

        <!-- Comment form — only if logged in -->
        <div v-else class="vc-form liquid-panel">
          <div class="vc-form-header">{{ t('vehicle.writeComment') }}</div>
          <textarea
            v-model="newComment"
            class="vc-textarea input-glass"
            :placeholder="t('vehicle.commentPlaceholder')"
            maxlength="1000"
            rows="3"
          ></textarea>
          <div class="vc-form-footer">
            <span class="vc-char-count">{{ newComment.length }} / 1000</span>
            <button
              class="vc-post-btn btn-glass"
              :disabled="commentSending || newComment.trim().length < 3"
              @click="handlePostComment"
            >
              {{ commentSending ? t('vehicle.posting') : t('vehicle.postComment') }}
            </button>
          </div>
          <div v-if="commentError" class="vc-error">{{ commentError }}</div>
        </div>

        <!-- Loading -->
        <div v-if="commentsLoading" class="vd-empty liquid-panel">
          <span class="vd-empty-text">{{ t('vehicle.loadingComments') }}</span>
        </div>

        <!-- Comment list -->
        <div v-else-if="comments.length > 0" class="vc-list">
          <div v-for="c in comments" :key="c.id" class="vc-comment liquid-panel">
            <div class="vc-comment-head">
              <span class="vc-comment-email">{{ anonymizeEmail(c.user_email) }}</span>
              <span class="vc-comment-time">{{ new Date(c.created_at).toLocaleDateString() }}</span>
            </div>
            <p class="vc-comment-body">{{ c.content }}</p>
            <button
              v-if="user && c.user_id === user.id"
              class="vc-delete-btn"
              @click="handleDeleteComment(c.id)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        <!-- No comments -->
        <div v-else class="vd-empty liquid-panel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span class="vd-empty-text">{{ t('vehicle.noComments') }}</span>
        </div>
      </section>

      <!-- ═══════════ Similar Vehicles ═══════════ -->
      <section v-if="relatedVehicles.length > 0" class="vd-section">
        <h2 class="vd-section-title">Similar Vehicles</h2>
        <div v-if="relatedVehiclesLoading" class="vd-empty glass-card-white">
          <span class="vd-empty-text">Loading similar vehicles...</span>
        </div>
        <div v-else class="vd-related-grid">
          <VehicleCard v-for="rv in relatedVehicles" :key="rv.id" :vehicle="rv" />
        </div>
      </section>

      <!-- ═══════════ Popular Community Tunes ═══════════ -->
      <section v-if="popularTunes.length > 0" class="vd-section">
        <h2 class="vd-section-title">Popular Community Tunes</h2>
        <div v-if="popularTunesLoading" class="vd-empty glass-card-white">
          <span class="vd-empty-text">Loading popular tunes...</span>
        </div>
        <div v-else class="vd-tunes-grid">
          <TuneCard v-for="t in popularTunes" :key="t.id" :tune="t" />
        </div>
      </section>

      <!-- ═══════════ About ═══════════ -->
      <section v-if="vehicle.description" class="vd-section">
        <h2 class="vd-section-title">About This Car</h2>
        <div class="vd-about liquid-panel">
          <p class="vd-about-text">{{ vehicle.description }}</p>
        </div>
      </section>
    </template>
  </div>

  <SubscriptionModal :open="showProModal" :reason="proModalReason" @close="closeProModal" />
</template>

<style scoped>
.vd-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

/* ── Back ── */
.vd-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  text-decoration: none;
  transition: all 0.2s ease;
  align-self: flex-start;
}

.vd-back:hover {
  color: #2d4a63;
  transform: translateX(-2px);
}

/* ── States ── */
.vd-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.vd-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 44px 36px;
  border-radius: 24px;
  text-align: center;
  max-width: 400px;
}

.vd-state-icon {
  font-size: 2.2rem;
  font-weight: 700;
  color: #4a6b85;
}

.vd-state-title {
  font-size: 1.1rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
}

.vd-state-text {
  font-size: 0.9rem;
  font-weight: 550;
  color: #4a6b85;
}

.vd-state-desc {
  font-size: 0.85rem;
  color: #374151;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
}

.vd-spinner {
  animation: vd-spin 0.9s linear infinite;
  color: #4a6b85;
}

@keyframes vd-spin {
  to { transform: rotate(360deg); }
}

.vd-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 12px;
  font-size: 0.84rem;
  font-weight: 620;
  color: #fff;
  background: #4a6b85;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 2px 12px rgba(63, 101, 135, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.24);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  font-family: inherit;
}

.vd-back-link:hover {
  background: #3d5c73;
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(63, 101, 135, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.30);
}

/* ═══════════ Hero ═══════════ */
.vd-hero {
  padding: 28px;
  border-radius: 24px;
  position: relative;
  z-index: 2;
}

.vd-hero-layout {
  display: flex;
  gap: 24px;
  align-items: center;
}

.vd-hero-img-wrap {
  width: 200px;
  height: 130px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.38);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 3px 10px rgba(0, 0, 0, 0.05);
}

.vd-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vd-hero-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.vd-hero-manufacturer {
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.vd-hero-name {
  font-size: 2rem;
  font-weight: 720;
  color: #111827;
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

/* ── Info Bar ── */
.vd-hero-infobar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 1px 6px rgba(0, 0, 0, 0.03);
  font-size: 0.78rem;
  font-weight: 580;
  color: #374151;
}

.vd-info-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.vd-info-item svg {
  color: #5b7a9a;
  flex-shrink: 0;
}

.vd-info-divider {
  font-size: 0.7rem;
  font-weight: 400;
  color: #c4cdd5;
  margin: 0 1px;
  user-select: none;
}

/* ── Favorite Actions ── */
.vd-hero-actions {
  margin-top: 4px;
}

.vd-fav-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 580;
  color: #4b5563;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.36);
}

.vd-fav-cta svg {
  color: #6b859e;
  flex-shrink: 0;
}

.vd-fav-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 12px;
  font-size: 0.84rem;
  font-weight: 620;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  border: 1px solid transparent;
  min-height: 44px;
}

.vd-fav-btn:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
}

.vd-fav-save {
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(255, 255, 255, 0.44);
  box-shadow:
    0 1px 4px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.44);
}

.vd-fav-save:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.78);
  border-color: rgba(91, 122, 154, 0.38);
  color: #2d4a63;
  transform: translateY(-1px);
  box-shadow:
    0 3px 12px rgba(91, 122, 154, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.52);
}

.vd-fav-saved {
  color: #fff;
  background: linear-gradient(180deg, #c97272 0%, #b85b5b 50%, #a04a4a 100%);
  border-color: rgba(255, 255, 255, 0.14);
  box-shadow:
    0 2px 10px rgba(184, 91, 91, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.vd-fav-saved:hover:not(:disabled) {
  background: linear-gradient(180deg, #d47c7c 0%, #c26464 50%, #a85050 100%);
  transform: translateY(-1px);
  box-shadow:
    0 4px 16px rgba(184, 91, 91, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.26);
}

/* ═══════════ Stats Cards ═══════════ */
.vd-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.vd-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;
  padding: 22px 14px;
  border-radius: 18px;
  position: relative;
  z-index: 2;
  text-align: center;
}

.vd-stat-card svg {
  color: #5b7a9a;
}

.vd-stat-value {
  font-size: 1.5rem;
  font-weight: 720;
  color: #111827;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.vd-stat-drivetrain,
.vd-stat-class {
  font-size: 1.15rem;
  letter-spacing: 0.02em;
}

.vd-stat-label {
  font-size: 0.66rem;
  font-weight: 650;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ═══════════ Sections ═══════════ */
.vd-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vd-section-title {
  font-size: 1.10rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
  letter-spacing: -0.01em;
}

/* ── Tunes grid ── */
.vd-tunes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 14px;
}

/* ── Related grid ── */
.vd-related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

/* ── Empty ── */
.vd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 36px 24px;
  border-radius: 18px;
  color: #6b7280;
  text-align: center;
}

.vd-empty-text {
  font-size: 0.85rem;
  font-weight: 520;
  color: #4b5563;
}

/* ── White card (non-glass) ── */
.glass-card-white {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.vd-empty-cta {
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 0.80rem;
  font-weight: 600;
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.38);
  text-decoration: none;
  transition: all 0.15s ease;
}

.vd-empty-cta:hover {
  background: rgba(255, 255, 255, 0.78);
  color: #2d4a63;
}

/* ── About ── */
.vd-about {
  padding: 24px 28px;
  border-radius: 18px;
}

.vd-about-text {
  font-size: 0.875rem;
  line-height: 1.75;
  color: #374151;
  font-weight: 500;
  margin: 0;
  position: relative;
  z-index: 2;
}

/* ═══════════ Comments ═══════════ */
.vc-login-cta {
  padding: 22px 24px;
  border-radius: 16px;
}

.vc-login-cta-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.92rem;
  font-weight: 600;
  color: #374151;
}

.vc-login-cta-inner svg {
  color: #5b7a9a;
  flex-shrink: 0;
}

.vc-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: 16px;
}

.vc-form-header {
  font-size: 0.82rem;
  font-weight: 650;
  color: #4a6b85;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vc-textarea {
  padding: 14px 16px;
  border-radius: 12px;
  font-size: 0.90rem;
  color: #111827;
  font-family: inherit;
  resize: vertical;
  min-height: 100px;
  width: 100%;
  line-height: 1.5;
}

.vc-textarea::placeholder {
  color: #9ca3af;
  font-size: 0.85rem;
}

.vc-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vc-char-count {
  font-size: 0.72rem;
  font-weight: 500;
  color: #6b7280;
}

.vc-post-btn {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 620;
}

.vc-post-btn:disabled {
  opacity: 0.45;
  cursor: default;
  transform: none;
}

.vc-error {
  font-size: 0.78rem;
  color: #b85b5b;
  font-weight: 550;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.14);
}

.vc-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vc-comment {
  padding: 18px 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-comment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vc-comment-email {
  font-size: 0.74rem;
  font-weight: 600;
  color: #5b7a9a;
}

.vc-comment-time {
  font-size: 0.68rem;
  font-weight: 500;
  color: #6b7280;
}

.vc-comment-body {
  font-size: 0.875rem;
  line-height: 1.6;
  color: #1f2937;
  font-weight: 500;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.vc-delete-btn {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 550;
  color: #333333;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
  background: transparent;
  border: 1px solid transparent;
}

.vc-delete-btn:hover {
  color: #b85b5b;
  background: rgba(184, 91, 91, 0.06);
  border-color: rgba(184, 91, 91, 0.14);
}

/* ═══════════ Mobile ═══════════ */
@media (max-width: 640px) {
  .vd-page {
    padding: 16px;
    padding-bottom: 60px;
    gap: 20px;
  }

  /* ── Hero mobile ── */
  .vd-hero {
    padding: 20px;
    border-radius: 20px;
  }

  .vd-hero-layout {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .vd-hero-img-wrap {
    width: 100%;
    height: 180px;
  }

  .vd-hero-name {
    font-size: 1.45rem;
  }

  .vd-hero-infobar {
    gap: 2px;
    padding: 8px 12px;
    font-size: 0.72rem;
  }

  .vd-info-item {
    padding: 2px 6px;
  }

  /* ── Stats: 2-col grid ── */
  .vd-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .vd-stat-card {
    padding: 18px 10px;
    gap: 7px;
    border-radius: 16px;
  }

  .vd-stat-card svg {
    width: 18px;
    height: 18px;
  }

  .vd-stat-value {
    font-size: 1.25rem;
  }

  .vd-stat-drivetrain,
  .vd-stat-class {
    font-size: 1rem;
  }

  .vd-stat-label {
    font-size: 0.62rem;
  }

  /* ── Grids: single column ── */
  .vd-tunes-grid {
    grid-template-columns: 1fr;
  }

  .vd-related-grid {
    grid-template-columns: 1fr;
  }

  /* ── Comments mobile ── */
  .vc-login-cta {
    padding: 18px 20px;
  }

  .vc-login-cta-inner {
    font-size: 0.84rem;
  }

  .vc-form {
    padding: 16px;
  }

  .vc-form-header {
    font-size: 0.78rem;
  }

  .vc-textarea {
    font-size: 0.84rem;
    min-height: 90px;
  }

  .vc-post-btn {
    padding: 9px 20px;
    font-size: 0.78rem;
  }

  /* ── States mobile ── */
  .vd-state-card {
    padding: 36px 24px;
  }

  /* ── About mobile ── */
  .vd-about {
    padding: 18px 20px;
  }
}
</style>
