<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'
import { getPublicTuneBySlug } from '../lib/tunesApi.js'
import { exportTuneToJson } from '../utils/tuneExport.js'
import { generateSlug } from '../utils/slug.js'
import { useToast } from '../composables/useToast.js'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { success } = useToast()

const tune = ref(null)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')
const isPrivate = ref(false)

const routeSlug = computed(() => route.params.slug)

const isAuthor = computed(() => user.value && tune.value?.user_id && user.value.id === tune.value.user_id)

const vehicleSlug = computed(() => {
  if (!tune.value?.vehicle_name) return ''
  if (tune.value.vehicle_id) {
    // Try to generate from manufacturer + name if we had those, else use vehicle_name
    return generateSlug('', tune.value.vehicle_name, '')
  }
  return ''
})

async function fetchTune() {
  loading.value = true
  notFound.value = false
  loadError.value = ''
  isPrivate.value = false
  tune.value = null

  try {
    const data = await getPublicTuneBySlug(routeSlug.value)
    if (!data) {
      notFound.value = true
      loading.value = false
      return
    }

    if (!data.is_public && data.user_id !== user.value?.id) {
      isPrivate.value = true
      loading.value = false
      return
    }

    tune.value = data
    loading.value = false

    const tuneTitle = data.title || data.personality_title || 'Forza Tune'
    const vehicleText = data.vehicle_name || 'Forza'
    const gameModeText = data.game_mode || data.build_type || ''
    useSeoMeta({
      title: `${tuneTitle} — ${vehicleText} Forza Tune Share Code`,
      description: `Share code ${data.share_code || 'N/A'} for ${vehicleText}. ${gameModeText} tune, ${data.drivetrain || ''}, class ${data.class_tier || data.pi_class || ''}. ${data.notes ? data.notes.slice(0, 120) : ''}`,
      ogType: 'article',
      canonical: `${window.location.origin}/tunes/${data.slug || data.id}`,
    })
  } catch (e) {
    console.error('PublicTuneView:', e)
    loadError.value = e.message || 'Failed to load tune.'
    loading.value = false
  }
}

fetchTune()
watch(routeSlug, () => { fetchTune() })

// ── Tune value categories ──
const tuneCategories = computed(() => {
  if (!tune.value) return []
  const t = tune.value
  const groups = [
    {
      title: 'Tire Pressure',
      rows: [
        { label: 'Front', value: t.tire_pressure_front, unit: 'psi' },
        { label: 'Rear', value: t.tire_pressure_rear, unit: 'psi' },
      ],
    },
    {
      title: 'Gearing',
      rows: [
        { label: 'Final Drive', value: t.gear_final_drive, unit: '' },
      ],
    },
    {
      title: 'Alignment',
      rows: [
        { label: 'Camber Front', value: t.camber_front, unit: '°' },
        { label: 'Camber Rear', value: t.camber_rear, unit: '°' },
        { label: 'Toe Front', value: t.toe_front, unit: '°' },
        { label: 'Toe Rear', value: t.toe_rear, unit: '°' },
      ],
    },
    {
      title: 'Anti-Roll Bars',
      rows: [
        { label: 'Front', value: t.antiroll_front, unit: '' },
        { label: 'Rear', value: t.antiroll_rear, unit: '' },
      ],
    },
    {
      title: 'Springs',
      rows: [
        { label: 'Front', value: t.spring_front, unit: 'N/mm' },
        { label: 'Rear', value: t.spring_rear, unit: 'N/mm' },
      ],
    },
    {
      title: 'Ride Height',
      rows: [
        { label: 'Front', value: t.ride_height_front, unit: 'cm' },
        { label: 'Rear', value: t.ride_height_rear, unit: 'cm' },
      ],
    },
    {
      title: 'Brakes',
      rows: [
        { label: 'Balance', value: t.brake_balance, unit: '% front' },
        { label: 'Pressure', value: t.brake_pressure, unit: '%' },
      ],
    },
    {
      title: 'Differential',
      rows: [
        { label: 'Accel', value: t.diff_accel, unit: '%' },
        { label: 'Decel', value: t.diff_decel, unit: '%' },
      ],
    },
  ]

  return groups.map(g => ({
    ...g,
    rows: g.rows.filter(r => r.value != null),
  })).filter(g => g.rows.length > 0)
})

const hasTuneValues = computed(() => tuneCategories.value.length > 0)

// ── Share Code Copy ──
const shareCodeCopied = ref(false)
function copyShareCode() {
  if (!tune.value?.share_code) return
  navigator.clipboard.writeText(tune.value.share_code).then(() => {
    shareCodeCopied.value = true
    success('Share code copied')
    setTimeout(() => { shareCodeCopied.value = false }, 2000)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = tune.value.share_code
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    shareCodeCopied.value = true
    success('Share code copied')
    setTimeout(() => { shareCodeCopied.value = false }, 2000)
  })
}

// ── Copy Tune ──
const copiedTune = ref(false)
function copyTune() {
  if (!tune.value) return
  const lines = []
  if (tune.value.title) lines.push(tune.value.title)
  if (tune.value.vehicle_name) lines.push(`Vehicle: ${tune.value.vehicle_name}`)
  if (tune.value.share_code) lines.push(`Share Code: ${tune.value.share_code}`)
  lines.push('')
  for (const cat of tuneCategories.value) {
    lines.push(`--- ${cat.title} ---`)
    for (const r of cat.rows) {
      const v = typeof r.value === 'number' ? parseFloat(r.value.toFixed(3)).toString() : r.value
      lines.push(`${r.label}: ${v}${r.unit ? ' ' + r.unit : ''}`)
    }
  }
  if (tune.value.notes) {
    lines.push('')
    lines.push(`Notes: ${tune.value.notes}`)
  }
  const text = lines.join('\n')
  navigator.clipboard.writeText(text).then(() => {
    copiedTune.value = true
    success('Tune copied')
    setTimeout(() => { copiedTune.value = false }, 2000)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copiedTune.value = true
    success('Tune copied')
    setTimeout(() => { copiedTune.value = false }, 2000)
  })
}

// ── Copy Link ──
const copiedLink = ref(false)
const copyLinkHint = ref('')
function copyLink() {
  copyLinkHint.value = ''
  if (tune.value?.is_public !== true && !isAuthor.value) {
    copyLinkHint.value = 'This tune is private.'
    return
  }
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    copiedLink.value = true
    success('Share link copied')
    setTimeout(() => { copiedLink.value = false }, 2000)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = url
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copiedLink.value = true
    success('Share link copied')
    setTimeout(() => { copiedLink.value = false }, 2000)
  })
}

// ── Open in Calculator ──
function openInCalculator() {
  if (tune.value?.id) {
    router.push(`/calculator?load=${tune.value.id}`)
  }
}

// ── Export JSON ──
function handleExport() {
  if (tune.value) exportTuneToJson(tune.value)
}

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="public-tune">
    <!-- Loading -->
    <div v-if="loading" class="pt-state">
      <div class="pt-state-card liquid-panel" style="width:100%;max-width:500px;">
        <div class="skeleton-lines">
          <div class="skeleton-line w-60"></div>
          <div class="skeleton-line w-40"></div>
          <div class="skeleton-line w-80"></div>
          <div class="skeleton-line w-50"></div>
        </div>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="notFound" class="pt-state">
      <div class="pt-state-card liquid-panel">
        <span class="pt-state-emoji">404</span>
        <h2 class="pt-state-title">Tune Not Found</h2>
        <p class="pt-state-desc">This tune may have been deleted or the link is incorrect.</p>
        <router-link to="/tunes" class="pt-back-link">Browse Tunes</router-link>
      </div>
    </div>

    <!-- Private -->
    <div v-else-if="isPrivate" class="pt-state">
      <div class="pt-state-card liquid-panel">
        <span class="pt-state-emoji">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <h2 class="pt-state-title">This tune is private</h2>
        <p class="pt-state-desc">The author has not made this tune public.</p>
        <router-link to="/tunes" class="pt-back-link">Browse Tunes</router-link>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="pt-state">
      <div class="pt-state-card liquid-panel">
        <span class="pt-state-emoji">!</span>
        <h2 class="pt-state-title">Failed to Load</h2>
        <p class="pt-state-desc">{{ loadError }}</p>
        <button class="pt-back-link" @click="fetchTune">Retry</button>
      </div>
    </div>

    <!-- Tune Content -->
    <template v-else-if="tune">
      <!-- Top bar -->
      <div class="pt-top">
        <router-link to="/tunes" class="pt-back liquid-glass">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          All Tunes
        </router-link>
      </div>

      <!-- ═══════════ Hero ═══════════ -->
      <div class="pt-hero liquid-panel">
        <!-- Vehicle link -->
        <router-link
          v-if="tune.vehicle_name"
          :to="vehicleSlug ? `/vehicles/${vehicleSlug}` : '/vehicles'"
          class="pt-vehicle-link"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
          </svg>
          {{ tune.vehicle_name }}
        </router-link>

        <h1 class="pt-title">{{ tune.title || tune.personality_title || 'Forza Tune' }}</h1>

        <!-- Meta row: game mode, class, drivetrain, date -->
        <div class="pt-meta-row">
          <span v-if="tune.game_mode" class="pt-meta-tag">{{ tune.game_mode }}</span>
          <span v-if="tune.class_tier || tune.pi_class" class="pt-meta-tag">{{ tune.class_tier || tune.pi_class }}</span>
          <span v-if="tune.drivetrain" class="pt-meta-tag">{{ tune.drivetrain }}</span>
          <span class="pt-date">{{ formatDate(tune.created_at) }}</span>
        </div>

        <p v-if="tune.notes" class="pt-notes">{{ tune.notes }}</p>
      </div>

      <!-- ═══════════ Share Code Card ═══════════ -->
      <div v-if="tune.share_code" class="pt-share-code-card liquid-panel">
        <div class="pt-share-code-inner">
          <div class="pt-share-code-left">
            <span class="pt-share-code-label">Share Code</span>
            <span class="pt-share-code-value">{{ tune.share_code }}</span>
          </div>
          <button class="pt-share-code-copy" @click="copyShareCode">
            <svg v-if="!shareCodeCopied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ shareCodeCopied ? 'Copied' : 'Copy' }}
          </button>
        </div>
      </div>

      <!-- No share code, no tune values -->
      <div v-if="!tune.share_code && !hasTuneValues" class="pt-no-data liquid-panel">
        <p class="pt-no-data-text">This tune only includes a share code reference.</p>
      </div>

      <!-- ═══════════ Tune Values ═══════════ -->
      <div v-if="hasTuneValues" class="pt-values-section">
        <h2 class="pt-section-title">Tune Values</h2>
        <div class="pt-values-grid">
          <div v-for="cat in tuneCategories" :key="cat.title" class="pt-value-cat liquid-panel">
            <h3 class="pt-cat-title">{{ cat.title }}</h3>
            <div class="pt-cat-rows">
              <div v-for="row in cat.rows" :key="row.label" class="pt-cat-row">
                <span class="pt-cat-label">{{ row.label }}</span>
                <span class="pt-cat-value">
                  {{ typeof row.value === 'number' ? parseFloat(row.value.toFixed(3)) : row.value
                  }}<span v-if="row.unit" class="pt-cat-unit"> {{ row.unit }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════ Actions ═══════════ -->
      <div class="pt-actions">
        <button class="btn-secondary" @click="copyTune">
          {{ copiedTune ? 'Copied' : 'Copy Tune' }}
        </button>
        <button class="btn-secondary" @click="copyLink">
          {{ copiedLink ? 'Copied' : 'Copy Link' }}
        </button>
        <span v-if="copyLinkHint" class="pt-copy-hint">{{ copyLinkHint }}</span>
        <button class="btn-secondary" @click="handleExport">Export JSON</button>
        <button v-if="isAuthor" class="btn-primary" @click="openInCalculator">
          Open in Calculator
        </button>
      </div>

      <!-- ═══════════ Bottom CTAs ═══════════ -->
      <div class="pt-ctas">
        <router-link
          v-if="tune.vehicle_name"
          :to="vehicleSlug ? `/vehicles/${vehicleSlug}` : '/vehicles'"
          class="pt-cta-card liquid-panel"
        >
          <span class="pt-cta-title">View Vehicle Details</span>
          <span class="pt-cta-desc">{{ tune.vehicle_name }}</span>
        </router-link>
        <router-link to="/calculator" class="pt-cta-card liquid-panel">
          <span class="pt-cta-title">Start Tuning</span>
          <span class="pt-cta-desc">Create a new tune in the calculator</span>
        </router-link>
        <router-link to="/tunes" class="pt-cta-card liquid-panel">
          <span class="pt-cta-title">Browse More Tunes</span>
          <span class="pt-cta-desc">Discover community setups</span>
        </router-link>
      </div>
    </template>
  </div>
</template>

<style scoped>
.public-tune {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
}

/* ── State cards ── */
.pt-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
}

.pt-state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 40px;
  border-radius: 24px;
  text-align: center;
  max-width: 400px;
}

.pt-state-emoji {
  font-size: 2.5rem;
  font-weight: 700;
  color: #4a6b85;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pt-state-title {
  font-size: 1.15rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
}

.pt-state-desc {
  font-size: 0.85rem;
  color: #4B5563;
  font-weight: 500;
  margin: 0;
  line-height: 1.55;
}

.pt-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 20px;
  border-radius: 12px;
  font-size: 0.84rem;
  font-weight: 620;
  color: #fff;
  background: #4a6b85;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  font-family: inherit;
}

.pt-back-link:hover {
  background: #3d5c73;
}

/* ── Top bar ── */
.pt-top {
  display: flex;
  align-items: center;
}

.pt-back {
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

.pt-back:hover {
  color: #2d4a63;
  transform: translateX(-2px);
}

/* ═══════════ Hero ═══════════ */
.pt-hero {
  padding: 32px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.pt-vehicle-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  color: #4a6b85;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: color 0.15s ease;
  align-self: flex-start;
}

.pt-vehicle-link:hover {
  color: #2d4a63;
}

.pt-title {
  font-size: 1.5rem;
  font-weight: 720;
  color: #111827;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.pt-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.pt-meta-tag {
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 620;
  color: #374151;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.pt-date {
  font-size: 0.74rem;
  font-weight: 520;
  color: #6b7280;
  margin-left: auto;
}

.pt-notes {
  font-size: 0.88rem;
  line-height: 1.65;
  color: #4B5563;
  font-weight: 500;
  margin: 4px 0 0;
  white-space: pre-wrap;
}

/* ═══════════ Share Code Card ═══════════ */
.pt-share-code-card {
  border-radius: 18px;
}

.pt-share-code-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  position: relative;
  z-index: 2;
}

.pt-share-code-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pt-share-code-label {
  font-size: 0.68rem;
  font-weight: 620;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.pt-share-code-value {
  font-size: 1.3rem;
  font-weight: 720;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
  color: #111827;
  word-break: break-all;
}

.pt-share-code-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: 640;
  font-family: inherit;
  color: #fff;
  background: linear-gradient(180deg, #6d92b0 0%, #50799a 35%, #3f6587 100%);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(63, 101, 135, 0.28);
}

.pt-share-code-copy:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(63, 101, 135, 0.38);
}

/* ── No Data ── */
.pt-no-data {
  padding: 32px 24px;
  border-radius: 18px;
  text-align: center;
}

.pt-no-data-text {
  font-size: 0.88rem;
  color: #6b7280;
  font-weight: 520;
  margin: 0;
}

/* ═══════════ Tune Values ═══════════ */
.pt-values-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pt-section-title {
  font-size: 0.95rem;
  font-weight: 680;
  color: #111827;
  margin: 0;
}

.pt-values-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.pt-value-cat {
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 2;
}

.pt-cat-title {
  font-size: 0.72rem;
  font-weight: 650;
  color: #6b859e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding-bottom: 8px;
}

.pt-cat-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pt-cat-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.pt-cat-label {
  font-size: 0.78rem;
  font-weight: 520;
  color: #4B5563;
}

.pt-cat-value {
  font-size: 0.85rem;
  font-weight: 640;
  color: #111827;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pt-cat-unit {
  font-weight: 500;
  color: #6b7280;
  font-size: 0.75rem;
}

/* ═══════════ Actions ═══════════ */
.pt-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pt-copy-hint {
  font-size: 0.74rem;
  font-weight: 550;
  color: #b8742a;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(194, 120, 74, 0.06);
  border: 1px solid rgba(194, 120, 74, 0.14);
  line-height: 1.4;
}

/* ═══════════ Bottom CTAs ═══════════ */
.pt-ctas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.pt-cta-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 22px;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
  position: relative;
  z-index: 2;
}

.pt-cta-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

.pt-cta-title {
  font-size: 0.84rem;
  font-weight: 660;
  color: #111827;
}

.pt-cta-desc {
  font-size: 0.72rem;
  font-weight: 500;
  color: #4B5563;
}

/* ── Skeleton ── */
.skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.skeleton-line {
  height: 14px;
  border-radius: 7px;
  background: rgba(139, 149, 161, 0.2);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-80 { width: 80%; }
.skeleton-line.w-50 { width: 50%; }

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* ═══════════ Mobile ═══════════ */
@media (max-width: 640px) {
  .public-tune {
    padding: 16px;
    padding-bottom: 60px;
    gap: 16px;
  }

  .pt-hero {
    padding: 22px 18px;
    border-radius: 20px;
  }

  .pt-title {
    font-size: 1.25rem;
  }

  .pt-share-code-inner {
    padding: 18px 20px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .pt-share-code-value {
    font-size: 1.15rem;
  }

  .pt-share-code-copy {
    align-self: flex-end;
  }

  .pt-values-grid {
    grid-template-columns: 1fr;
  }

  .pt-value-cat {
    padding: 16px 18px;
  }

  .pt-ctas {
    grid-template-columns: 1fr;
  }

  .pt-state-card {
    padding: 36px 24px;
  }
}
</style>
