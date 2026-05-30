<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { generateDrivingInsights, formatTuneText, generateApplySteps, formatApplyStepsText } from '../utils/tuningCalculator.js'
import { useSeoMeta, makeTuneSchema, makeBreadcrumbSchema } from '../composables/useSeoMeta.js'
import { useI18n } from '../i18n/index.js'
import { useAuth } from '../composables/useAuth.js'
import { useProAccess } from '../composables/useProAccess.js'
import SubscriptionModal from '../components/SubscriptionModal.vue'

const route = useRoute()
const router = useRouter()
const { t, currentLang } = useI18n()
const { user } = useAuth()
const { isPro } = useProAccess()
const tableName = computed(() => isPro.value ? 'tunes' : 'tunes_public')

const tune = ref(null)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')

const routeParam = computed(() => route.params.slug)
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

const showDeleteConfirm = ref(false)
const deletingTune = ref(false)
const deleteError = ref('')

const showProModal = ref(false)
const proModalReason = ref('')

function requirePro(reason) {
  if (!isPro.value) {
    proModalReason.value = reason
    showProModal.value = true
    return false
  }
  return true
}

function closeProModal() { showProModal.value = false }

const isAuthor = computed(() => user.value && tune.value?.user_id && user.value.id === tune.value.user_id)

function openDeleteConfirm() { showDeleteConfirm.value = true }
function closeDeleteConfirm() { showDeleteConfirm.value = false; deleteError.value = '' }

async function handleDeleteTune() {
  if (!tune.value?.id || !supabase) return
  deletingTune.value = true
  deleteError.value = ''
  try {
    const { error: delError } = await supabase.from('tunes').delete().eq('id', tune.value.id)
    if (delError) {
      console.error('TuneDetailView: delete error', delError)
      deleteError.value = delError.message
      return
    }
    router.push('/tunes')
  } catch (e) {
    console.error('TuneDetailView: delete exception', e)
    deleteError.value = e.message || t('tunes.deleteFailed')
  } finally {
    deletingTune.value = false
  }
}

async function fetchTune() {
  if (!supabase) {
    loadError.value = 'Database not configured.'
    loading.value = false
    return
  }

  loading.value = true
  notFound.value = false
  loadError.value = ''
  tune.value = null

  try {
    let query = supabase.from(tableName.value).select('*')
    if (isUuid(routeParam.value)) {
      query = query.eq('id', routeParam.value)
    } else {
      query = query.eq('slug', routeParam.value)
    }
    const { data, error: fetchError } = await query.single()

    if (fetchError) {
      console.error('TuneDetailView: fetch error', fetchError)
      if (fetchError.code === 'PGRST116') {
        notFound.value = true
      } else {
        loadError.value = fetchError.message
      }
      loading.value = false
      return
    }

    if (!data) {
      console.error('TuneDetailView: null data returned')
      notFound.value = true
      loading.value = false
      return
    }

    tune.value = data
    loading.value = false

    const td = data.tune_data || {}
    const tuneTitle = data.title || td.personalityTitle || t('tuneDetail.forzaTune')
    useSeoMeta({
      title: `${tuneTitle} — ${data.vehicle_name || 'Forza'} — Forza Tuning Calculator`,
      description: data.description || `${data.build_type} ${data.driving_style} tune for ${data.vehicle_name || 'Forza'}. ${data.power_hp} HP, ${data.weight_kg} kg, ${data.drivetrain}.`,
      ogType: 'article',
      jsonLd: makeTuneSchema(data),
      canonical: `${window.location.origin}/tunes/${data.slug || data.id}`,
    })
  } catch (e) {
    console.error('TuneDetailView:', e)
    loadError.value = e.message || 'Failed to load tune.'
    loading.value = false
  }
}

fetchTune()
watch(routeParam, () => { fetchTune() })

const tuneForm = computed(() => {
  if (!tune.value?.tune_data?.form) return {}
  return tune.value.tune_data.form
})

const tuneResult = computed(() => {
  if (!tune.value?.tune_data?.result) return null
  return tune.value.tune_data.result
})

const drivingInsights = computed(() => {
  if (!tuneResult.value) return []
  return generateDrivingInsights({ behavior: tuneResult.value.behavior }, currentLang.value)
})

const applySteps = computed(() => {
  if (!tuneResult.value) return []
  return generateApplySteps(tuneResult.value, currentLang.value)
})

const resultRows = [
  { label: 'Tire Pressure', fmt: v => `${v.tirePressureFront} / ${v.tirePressureRear}`, unit: 'psi', desc: 'Front / Rear' },
  { label: 'Final Drive', fmt: v => v.finalDrive.toFixed(2), unit: '', desc: 'Gear ratio' },
  { label: 'Camber', fmt: v => `${v.camberFront}° / ${v.camberRear}°`, unit: '', desc: 'Front / Rear' },
  { label: 'Toe', fmt: v => `${v.toeFront}° / ${v.toeRear}°`, unit: '', desc: 'Front / Rear' },
  { label: 'Anti-Roll Bars', fmt: v => `${v.antirollFront} / ${v.antirollRear}`, unit: '', desc: 'Front / Rear stiffness' },
  { label: 'Springs', fmt: v => `${v.springFront} / ${v.springRear}`, unit: 'N/mm', desc: 'Front / Rear rate' },
  { label: 'Ride Height', fmt: v => `${v.rideHeight}`, unit: 'cm', desc: 'Chassis clearance' },
  { label: 'Brake Balance', fmt: v => `${v.brakeBalance}%`, unit: 'front', desc: 'Bias distribution' },
  { label: 'Brake Pressure', fmt: v => `${v.brakePressure}%`, unit: '', desc: 'Force applied' },
  { label: 'Diff Accel', fmt: v => `${v.diffAccel}%`, unit: '', desc: 'Acceleration lock' },
  { label: 'Diff Decel', fmt: v => `${v.diffDecel}%`, unit: '', desc: 'Deceleration lock' },
]

const severityClass = (severity) => ({
  good: 'severity-good',
  neutral: 'severity-neutral',
  warning: 'severity-warning',
}[severity] || 'severity-neutral')

const copied = ref(false)
const copiedSteps = ref(false)

function copyTune() {
  if (!tuneResult.value) return
  const text = formatTuneText(tuneResult.value, { ...tuneForm.value })
  navigator.clipboard.writeText(text).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  })
}

function copySteps() {
  const text = formatApplyStepsText(applySteps.value)
  navigator.clipboard.writeText(text).then(() => {
    copiedSteps.value = true
    setTimeout(() => { copiedSteps.value = false }, 2000)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copiedSteps.value = true
    setTimeout(() => { copiedSteps.value = false }, 2000)
  })
}

function shareTune() {
  const url = window.location.href
  navigator.clipboard.writeText(url).catch(() => {
    const ta = document.createElement('textarea'); ta.value = url
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
  })
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="tune-detail">
    <!-- ── Loading ── -->
    <div v-if="loading" class="td-state">
      <div class="td-state-card liquid-panel">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="td-spinner">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span class="td-state-text">{{ t('tuneDetail.loading') }}</span>
      </div>
    </div>

    <!-- ── 404 ── -->
    <div v-else-if="notFound" class="td-state">
      <div class="td-state-card liquid-panel">
        <span class="td-state-emoji">404</span>
        <h2 class="td-state-title">{{ t('tuneDetail.notFound') }}</h2>
        <p class="td-state-desc">{{ t('tuneDetail.notFoundDesc') }}</p>
        <router-link to="/tunes" class="td-back-link">{{ t('tuneDetail.browseTunes') }}</router-link>
      </div>
    </div>

    <!-- ── Error ── -->
    <div v-else-if="loadError" class="td-state">
      <div class="td-state-card liquid-panel">
        <span class="td-state-emoji">!</span>
        <h2 class="td-state-title">{{ t('tuneDetail.failedToLoad') }}</h2>
        <p class="td-state-desc">{{ loadError }}</p>
        <button class="td-back-link" @click="fetchTune">{{ t('tuneDetail.retry') }}</button>
      </div>
    </div>

    <!-- ── Tune Content ── -->
    <template v-else-if="tune">
      <!-- Back link -->
      <div class="td-top">
        <router-link to="/tunes" class="td-back liquid-glass">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          {{ t('tuneDetail.allTunes') }}
        </router-link>

        <div class="td-actions-top">
          <button class="btn-copy" @click="requirePro('Copy full tune values') ? copyTune() : null">
            <svg v-if="!copied" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ copied ? t('tuneDetail.copied') : t('tuneDetail.copyTune') }}
          </button>
          <button class="btn-share" @click="shareTune">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {{ t('tuneDetail.share') }}
          </button>
        </div>
      </div>

      <!-- Hero -->
      <div class="td-hero liquid-panel">
        <div class="td-hero-top">
          <router-link
            v-if="tune.vehicle_name"
            :to="`/vehicles/${tune.vehicle_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`"
            class="td-vehicle-link"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
            </svg>
            {{ tune.vehicle_name }}
          </router-link>
          <button
            v-if="isAuthor"
            class="td-delete-btn liquid-glass"
            @click="openDeleteConfirm"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {{ t('tunes.deleteTune') }}
          </button>
        </div>
        <h1 class="td-title">{{ tune.title || tune.personality_title || t('tuneDetail.forzaTune') }}</h1>
        <div class="td-meta">
          <span v-if="tune.author_name" class="td-author">{{ tune.author_name }}</span>
          <span class="td-date">{{ formatDate(tune.created_at) }}</span>
        </div>
        <div class="td-tags">
          <span class="td-tag liquid-glass">{{ tune.build_type }}</span>
          <span class="td-tag liquid-glass">{{ tune.driving_style }}</span>
          <span class="td-tag liquid-glass">{{ tune.drivetrain }}</span>
          <span v-if="tune.class_tier" class="td-tag liquid-glass">{{ tune.class_tier }}</span>
          <span class="td-tag liquid-glass">{{ tune.power_hp }} HP</span>
          <span class="td-tag liquid-glass">{{ tune.weight_kg }} kg</span>
        </div>
      </div>

      <div class="td-content">
        <!-- Personality -->
        <div v-if="tune.personality_title" class="personality-card">
          <div class="personality-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div>
              <h3 class="personality-title">{{ tune.personality_title }}</h3>
              <span class="personality-label">{{ t('tuneDetail.tunePersonality') }}</span>
            </div>
          </div>
          <div v-if="tune.description" class="td-description">{{ tune.description }}</div>
        </div>

        <!-- Driving Insights -->
        <div v-if="tuneResult && drivingInsights.length > 0" class="insights-section">
          <h3 class="insights-title">{{ t('tuneDetail.drivingInsights') }}</h3>
          <span class="insights-subtitle">{{ t('tuneDetail.insightsSubtitle') }}</span>
          <div class="insights-grid">
            <div v-for="insight in drivingInsights" :key="insight.title" class="insight-card liquid-glass">
              <div class="insight-header">
                <span class="insight-title">{{ insight.title }}</span>
                <span :class="['insight-severity', severityClass(insight.severity)]">{{ insight.status }}</span>
              </div>
              <p class="insight-desc">{{ insight.description }}</p>
            </div>
          </div>
        </div>

        <!-- Tuning Results (Pro only) -->
        <div v-if="tuneResult && isPro" class="td-section">
          <h3 class="td-section-title">{{ t('tuneDetail.tuningResults') }}</h3>
          <div class="result-grid">
            <div v-for="row in resultRows" :key="row.label" class="result-card liquid-card">
              <div class="readable-layer">
                <div class="result-value">
                  <span class="result-number">{{ row.fmt(tuneResult) }}</span>
                  <span v-if="row.unit" class="result-unit">{{ row.unit }}</span>
                </div>
                <div class="result-label">{{ row.label }}</div>
                <div class="result-desc">{{ row.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Apply In Game (Pro only) -->
        <div v-if="tuneResult && isPro" class="apply-section">
          <div class="apply-header">
            <div class="apply-header-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <h3 class="apply-title">{{ t('tuneDetail.applyInGame') }}</h3>
            </div>
            <button class="btn-apply" @click="copySteps">
              <svg v-if="!copiedSteps" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ copiedSteps ? t('tuneDetail.copied') : t('tuneDetail.copySteps') }}
            </button>
          </div>
          <div class="step-list">
            <div v-for="(step, i) in applySteps" :key="step.title" class="step-group">
              <div class="step-number">{{ i + 1 }}</div>
              <div class="step-body">
                <h4 class="step-title">{{ step.title }}</h4>
                <div class="step-item" v-for="(item, j) in step.items" :key="j">{{ item }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pro Locked Card -->
        <div v-if="tuneResult && !isPro" class="td-locked liquid-panel">
          <div class="td-locked-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3 class="td-locked-title">Pro Tune Locked</h3>
          <p class="td-locked-desc">Upgrade to Pro to unlock full tuning values, copy presets, save favorites, and advanced calculator tools.</p>
          <button class="td-unlock-btn btn-glass" @click="requirePro('View full tune details') || null">Unlock Pro</button>
        </div>
      </div>
    </template>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="td-del-overlay" @click.self="closeDeleteConfirm">
        <div class="td-del-modal liquid-panel" @click.stop>
          <div class="td-del-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <h3 class="td-del-title">{{ t('tunes.deleteConfirm') }}</h3>
          <div v-if="deleteError" class="td-del-error">{{ deleteError }}</div>
          <div class="td-del-actions">
            <button class="td-del-cancel" @click="closeDeleteConfirm">{{ t('auth.cancel') }}</button>
            <button class="td-del-confirm" :disabled="deletingTune" @click="handleDeleteTune">
              {{ deletingTune ? t('tunes.loading') : t('tunes.confirmDelete') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <SubscriptionModal :open="showProModal" :reason="proModalReason" @close="closeProModal" />
  </div>
</template>

<style scoped>
.tune-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* ── State cards (loading / 404 / error) ── */
.td-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.td-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 40px;
  border-radius: 24px;
  text-align: center;
  max-width: 400px;
}

.td-state-emoji {
  font-size: 2.5rem;
  font-weight: 700;
  color: #4a6b85;
  line-height: 1;
}

.td-state-title {
  font-size: 1.15rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
}

.td-state-text {
  font-size: 0.9rem;
  font-weight: 550;
  color: #4a6b85;
}

.td-state-desc {
  font-size: 0.85rem;
  color: #222222;
  font-weight: 500;
  margin: 0;
  line-height: 1.55;
}

.td-spinner {
  animation: td-spin 0.9s linear infinite;
  color: #4a6b85;
}

@keyframes td-spin {
  to { transform: rotate(360deg); }
}

.td-back-link {
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
}

.td-back-link:hover {
  background: rgba(255, 255, 255, 0.35);
  color: #2d4a63;
}

/* ── Top bar ── */
.td-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.td-back {
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
}

.td-back:hover {
  color: #2d4a63;
  transform: translateX(-2px);
}

.td-actions-top {
  display: flex;
  gap: 8px;
}

/* ── Hero ── */
.td-hero {
  padding: 36px 32px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.td-hero-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.td-delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #b85b5b;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  border: 1px solid rgba(184, 91, 91, 0.25);
  background: rgba(184, 91, 91, 0.04);
}

.td-delete-btn:hover {
  color: #fff;
  background: rgba(184, 91, 91, 0.7);
  border-color: rgba(184, 91, 91, 0.5);
  transform: translateY(-1px);
}

/* ── Delete Modal ── */
.td-del-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 18, 32, 0.30);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  padding: 20px;
}

.td-del-modal {
  width: 100%;
  max-width: 380px;
  padding: 24px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.td-del-icon {
  color: #b85b5b;
  display: flex;
  justify-content: center;
}

.td-del-title {
  font-size: 0.95rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
}

.td-del-desc {
  font-size: 0.8rem;
  color: #333333;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
}

.td-del-error {
  font-size: 0.75rem;
  color: #b85b5b;
  font-weight: 550;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.14);
}

.td-del-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 4px;
}

.td-del-cancel {
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #333333;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.36);
  cursor: pointer;
  font-family: inherit;
}

.td-del-cancel:hover {
  background: rgba(255, 255, 255, 0.34);
  border-color: rgba(255, 255, 255, 0.48);
  color: #222222;
}

.td-del-confirm {
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  background: rgba(184, 91, 91, 0.7);
  border: 1px solid rgba(184, 91, 91, 0.4);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
}

.td-del-confirm:hover:not(:disabled) {
  background: rgba(184, 91, 91, 0.85);
}

.td-del-confirm:disabled {
  opacity: 0.5;
  cursor: default;
}

.td-vehicle-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #4a6b85;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: color 0.15s ease;
}

.td-vehicle-link:hover {
  color: #2d4a63;
}

.td-title {
  font-size: 1.5rem;
  font-weight: 720;
  color: #111111;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.td-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.82rem;
  color: #222222;
  font-weight: 520;
}

.td-author {
  font-weight: 600;
  color: #111111;
}

.td-date {
  color: #333333;
}

.td-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.td-tag {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #222222;
}

/* ── Content ── */
.td-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.td-description {
  font-size: 0.85rem;
  line-height: 1.65;
  color: #222222;
  font-weight: 500;
  margin: 0;
  padding-top: 4px;
}

.td-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.td-section-title {
  font-size: 0.9rem;
  font-weight: 650;
  color: #111111;
  margin: 0;
}

/* ── Reused component styles (same as CalculatorView) ── */

/* Personality */
.personality-card {
  position: relative;
  z-index: 2;
  padding: 20px 22px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.20);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.36);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.42),
    0 3px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.personality-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #5b7a9a;
}

.personality-title {
  font-size: 0.95rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
  line-height: 1.2;
}

.personality-label {
  font-size: 0.65rem;
  font-weight: 550;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: block;
  margin-top: 2px;
}

/* Insights */
.insights-section {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.insights-title {
  font-size: 0.9rem;
  font-weight: 650;
  color: #111111;
  margin: 0;
}

.insights-subtitle {
  font-size: 0.72rem;
  font-weight: 520;
  color: #6b859e;
  margin-bottom: 8px;
  display: block;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.insight-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.20);
  backdrop-filter: blur(12px) saturate(155%);
  -webkit-backdrop-filter: blur(12px) saturate(155%);
  border: 1px solid rgba(255, 255, 255, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.38),
    0 2px 8px rgba(0, 0, 0, 0.03);
}

.insight-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.insight-title {
  font-size: 0.82rem;
  font-weight: 680;
  color: #111111;
}

.insight-severity {
  font-size: 0.62rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.severity-good {
  color: #3d6a4a;
  background: rgba(91, 138, 106, 0.12);
  border: 1px solid rgba(91, 138, 106, 0.22);
}

.severity-neutral {
  color: #4a6b85;
  background: rgba(91, 122, 154, 0.10);
  border: 1px solid rgba(91, 122, 154, 0.20);
}

.severity-warning {
  color: #b8742a;
  background: rgba(194, 120, 74, 0.10);
  border: 1px solid rgba(194, 120, 74, 0.22);
}

.insight-desc {
  font-size: 0.75rem;
  line-height: 1.6;
  color: #222222;
  font-weight: 500;
  margin: 0;
}

/* Result grid */
.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 12px;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.result-card {
  padding: 12px;
  border-radius: 18px;
}

.result-card .readable-layer {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-value {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 2px;
  position: relative;
  z-index: 2;
}

.result-number {
  font-size: 1.1rem;
  font-weight: 660;
  color: #111111;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  word-break: break-word;
  line-height: 1.3;
}

.result-unit {
  font-size: 0.73rem;
  font-weight: 580;
  color: #222222;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.result-label {
  font-size: 0.78rem;
  font-weight: 620;
  color: #111111;
  line-height: 1.3;
  position: relative;
  z-index: 2;
}

.result-desc {
  font-size: 0.72rem;
  font-weight: 550;
  color: #222222;
  position: relative;
  z-index: 2;
}

/* Apply section */
.apply-section {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.apply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.apply-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5b8a6a;
}

.apply-title {
  font-size: 0.9rem;
  font-weight: 650;
  color: #111111;
  margin: 0;
}

.btn-apply {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #5b8a6a;
  background: rgba(91, 138, 106, 0.08);
  border: 1px solid rgba(91, 138, 106, 0.18);
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-apply:hover {
  background: rgba(91, 138, 106, 0.14);
  border-color: rgba(91, 138, 106, 0.28);
  color: #3d6a4a;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-group {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.15s ease;
}

.step-group:hover {
  background: rgba(255, 255, 255, 0.12);
}

.step-number {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #4a6b85;
  margin-top: 1px;
}

.step-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.step-title {
  font-size: 0.82rem;
  font-weight: 650;
  color: #111111;
  margin: 0;
}

.step-item {
  font-size: 0.75rem;
  color: #4a5568;
  font-weight: 520;
  line-height: 1.5;
}

/* Copy / Share buttons (from CalculatorView) */
.btn-copy {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(14px) saturate(165%);
  -webkit-backdrop-filter: blur(14px) saturate(165%);
  border: 1px solid rgba(255, 255, 255, 0.48);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.035), inset 0 1px 0 rgba(255, 255, 255, 0.58);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
}

.btn-copy:hover {
  color: #3d5c73;
  background: rgba(255, 255, 255, 0.40);
  border-color: rgba(255, 255, 255, 0.55);
  box-shadow: 0 3px 16px rgba(91, 122, 154, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.64);
  transform: translateY(-1px);
}

.btn-share {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: inherit;
  color: #5b7a9a;
  background: rgba(91, 122, 154, 0.07);
  border: 1px solid rgba(91, 122, 154, 0.16);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
}

.btn-share:hover {
  background: rgba(91, 122, 154, 0.14);
  border-color: rgba(91, 122, 154, 0.28);
  color: #3d5c73;
  transform: translateY(-1px);
}

/* ── Pro Locked ── */
.td-locked {
  padding: 40px 32px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.td-locked-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(74, 107, 133, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a6b85;
}

.td-locked-title {
  font-size: 1rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
}

.td-locked-desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #222222;
  font-weight: 500;
  margin: 0;
  max-width: 360px;
}

.td-unlock-btn {
  padding: 12px 28px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 620;
  margin-top: 4px;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .tune-detail {
    padding: 16px;
    padding-bottom: 60px;
    gap: 18px;
  }

  .td-hero {
    padding: 24px 20px;
    border-radius: 20px;
    gap: 10px;
  }

  .td-title {
    font-size: 1.25rem;
  }

  .insights-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .insight-card {
    padding: 14px 16px;
    border-radius: 14px;
  }

  .insight-title {
    font-size: 0.8rem;
  }

  .insight-desc {
    font-size: 0.73rem;
  }

  .result-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }

  .result-card {
    padding: 14px 16px;
    border-radius: 16px;
  }

  .result-number {
    font-size: 1rem;
  }

  .step-group {
    padding: 8px 10px;
    gap: 8px;
  }

  .step-item {
    font-size: 0.72rem;
  }

  .td-state-card {
    padding: 36px 24px;
  }

  .btn-copy,
  .btn-share {
    min-height: 40px;
    padding: 10px 14px;
    font-size: 0.76rem;
  }

  .btn-apply {
    min-height: 38px;
    padding: 8px 14px;
  }
}
</style>
