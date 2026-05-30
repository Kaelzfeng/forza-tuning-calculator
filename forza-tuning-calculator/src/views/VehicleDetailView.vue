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

        // Related vehicles
        const { data: rData } = await supabase
          .from('vehicles')
          .select('*')
          .neq('id', vData.id)
          .or(`class.eq.${vData.class || ''},manufacturer.eq.${vData.manufacturer || ''}`)
          .limit(4)
        relatedVehicles.value = rData || []

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

const favToggling = ref(false)

async function handleToggleFavorite() {
  if (!vehicle.value?.id) return
  favToggling.value = true
  try {
    await toggleFavorite(vehicle.value.id)
  } catch (e) {
    if (e.message === 'Pro required') {
      openProModal('Favorite tunes for quick access')
    }
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

      <!-- ── Hero ── -->
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
            <div class="vd-hero-tags">
              <span v-if="vehicle.year" class="vd-tag liquid-glass">{{ vehicle.year }}</span>
              <span v-if="vehicle.country" class="vd-tag liquid-glass">{{ vehicle.country }}</span>
              <span v-if="vehicle.drivetrain" class="vd-tag liquid-glass">{{ vehicle.drivetrain }}</span>
              <span v-if="vehicle.class" class="vd-tag liquid-glass">{{ vehicle.class }}</span>
            </div>
            <div class="vd-hero-actions">
              <button
                v-if="!user"
                class="vd-fav-btn vd-fav-login liquid-glass"
                :title="t('vehicle.loginToSave')"
                disabled
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {{ t('vehicle.loginToSave') }}
              </button>
              <button
                v-else-if="isFavorite(vehicle.id)"
                class="vd-fav-btn vd-fav-saved liquid-glass"
                :disabled="favToggling"
                @click="handleToggleFavorite"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {{ t('vehicle.saved') }}
              </button>
              <button
                v-else
                class="vd-fav-btn vd-fav-save liquid-glass"
                :disabled="favToggling"
                @click="handleToggleFavorite"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {{ t('vehicle.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Stats ── -->
      <div class="vd-stats liquid-panel">
        <div class="vd-stat" v-if="vehicle.horsepower">
          <span class="vd-stat-value">{{ vehicle.horsepower }}</span>
          <span class="vd-stat-label">HP</span>
        </div>
        <div class="vd-stat" v-if="vehicle.weight">
          <span class="vd-stat-value">{{ vehicle.weight }}</span>
          <span class="vd-stat-label">kg</span>
        </div>
      </div>

      <!-- ── Community Tunes ── -->
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

      <!-- ── Comments ── -->
      <section v-if="vehicle.id" class="vd-section">
        <h2 class="vd-section-title">{{ t('vehicle.comments') }}</h2>

        <!-- Not logged in -->
        <div v-if="!user" class="vc-login-hint liquid-panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          {{ t('vehicle.loginToComment') }}
        </div>

        <!-- Comment form -->
        <div v-else class="vc-form liquid-panel">
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

      <!-- ── Related Vehicles ── -->
      <section v-if="relatedVehicles.length > 0" class="vd-section">
        <h2 class="vd-section-title">Related Vehicles</h2>
        <div class="vd-related-grid">
          <VehicleCard v-for="rv in relatedVehicles" :key="rv.id" :vehicle="rv" />
        </div>
      </section>

      <!-- ── About ── -->
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
  color: #0f1720;
  margin: 0;
}

.vd-state-text {
  font-size: 0.9rem;
  font-weight: 550;
  color: #4a6b85;
}

.vd-state-desc {
  font-size: 0.85rem;
  color: #334155;
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
  padding: 8px 18px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.38);
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  font-family: inherit;
}

.vd-back-link:hover {
  background: rgba(255, 255, 255, 0.35);
  color: #2d4a63;
}

/* ── Hero ── */
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
  width: 180px;
  height: 120px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.vd-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vd-hero-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.vd-hero-manufacturer {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.vd-hero-name {
  font-size: 1.5rem;
  font-weight: 720;
  color: #0f1720;
  margin: 0;
  line-height: 1.15;
  letter-spacing: -0.015em;
}

.vd-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vd-hero-actions {
  margin-top: 4px;
}

.vd-fav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.vd-fav-btn:disabled {
  opacity: 0.5;
  cursor: default;
  transform: none;
}

.vd-fav-login {
  color: #8b95a1;
  cursor: default;
}

.vd-fav-save {
  color: #4a6b85;
}

.vd-fav-save:hover:not(:disabled) {
  color: #2d4a63;
  transform: translateY(-1px);
}

.vd-fav-saved {
  color: #b85b5b;
}

.vd-fav-saved:hover:not(:disabled) {
  transform: translateY(-1px);
}

.vd-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #334155;
}

/* ── Stats ── */
.vd-stats {
  display: flex;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 18px;
  position: relative;
  z-index: 2;
  flex-wrap: wrap;
}

.vd-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
  min-width: 60px;
  position: relative;
  z-index: 2;
}

.vd-stat-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f1720;
  font-variant-numeric: tabular-nums;
}

.vd-stat-label {
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Sections ── */
.vd-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vd-section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.vd-section-title {
  font-size: 1rem;
  font-weight: 680;
  color: #0f1720;
  margin: 0;
  letter-spacing: -0.01em;
}

.vd-section-link {
  font-size: 0.75rem;
  font-weight: 550;
  color: #5b7a9a;
  text-decoration: none;
}

.vd-section-link:hover {
  color: #3d5c73;
}

/* ── Tunes grid ── */
.vd-tunes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 12px;
}

/* ── Empty ── */
.vd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 20px;
  border-radius: 18px;
  color: #7b8ea0;
  text-align: center;
}

.vd-empty-text {
  font-size: 0.82rem;
  font-weight: 520;
  color: #5a6775;
}

.vd-empty-cta {
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.35);
  text-decoration: none;
  transition: all 0.15s ease;
}

.vd-empty-cta:hover {
  background: rgba(255, 255, 255, 0.35);
  color: #2d4a63;
}

/* ── Related ── */
.vd-related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* ── About ── */
.vd-about {
  padding: 22px 26px;
  border-radius: 18px;
}

.vd-about-text {
  font-size: 0.85rem;
  line-height: 1.75;
  color: #334155;
  font-weight: 500;
  margin: 0;
  position: relative;
  z-index: 2;
}

/* ── Comments ── */
.vc-login-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 14px;
  font-size: 0.8rem;
  font-weight: 550;
  color: #7b8ea0;
}

.vc-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
}

.vc-textarea {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.85rem;
  color: #2d3748;
  font-family: inherit;
  resize: vertical;
  min-height: 72px;
  width: 100%;
  line-height: 1.5;
}

.vc-textarea::placeholder {
  color: #8b95a1;
}

.vc-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vc-char-count {
  font-size: 0.68rem;
  font-weight: 500;
  color: #8b95a1;
}

.vc-post-btn {
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 0.78rem;
}

.vc-post-btn:disabled {
  opacity: 0.5;
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
  padding: 16px 18px;
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
  font-size: 0.72rem;
  font-weight: 600;
  color: #5b7a9a;
}

.vc-comment-time {
  font-size: 0.65rem;
  font-weight: 500;
  color: #8b95a1;
}

.vc-comment-body {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #334155;
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
  color: #8b95a1;
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

/* ── Mobile ── */
@media (max-width: 640px) {
  .vd-page {
    padding: 16px;
    padding-bottom: 60px;
    gap: 18px;
  }

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
    height: 160px;
  }

  .vd-hero-name {
    font-size: 1.25rem;
  }

  .vd-stats {
    padding: 16px 18px;
    gap: 12px;
    justify-content: space-around;
  }

  .vd-stat-value {
    font-size: 1rem;
  }

  .vd-tunes-grid {
    grid-template-columns: 1fr;
  }

  .vd-related-grid {
    grid-template-columns: 1fr;
  }

  .vd-state-card {
    padding: 36px 24px;
  }
}
</style>
