<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'
import { getPublicTuneBySlug } from '../lib/tunesApi.js'
import { exportTuneToJson } from '../utils/tuneExport.js'
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
    useSeoMeta({
      title: `${tuneTitle} — ${data.vehicle_name || 'Forza'} — Forza Tuning Calculator`,
      description: data.description || `${data.build_type || ''} ${data.driving_style || ''} tune — ${data.vehicle_name || 'Forza'}`,
      ogType: 'article',
    })
  } catch (e) {
    console.error('PublicTuneView:', e)
    loadError.value = e.message || 'Failed to load tune.'
    loading.value = false
  }
}

fetchTune()
watch(routeSlug, () => { fetchTune() })

const tuneRows = computed(() => {
  if (!tune.value) return []
  return [
    { label: 'Tire Pressure Front', value: tune.value.tire_pressure_front, unit: 'psi' },
    { label: 'Tire Pressure Rear', value: tune.value.tire_pressure_rear, unit: 'psi' },
    { label: 'Final Drive', value: tune.value.gear_final_drive, unit: '' },
    { label: 'Camber Front', value: tune.value.camber_front, unit: '°' },
    { label: 'Camber Rear', value: tune.value.camber_rear, unit: '°' },
    { label: 'Toe Front', value: tune.value.toe_front, unit: '°' },
    { label: 'Toe Rear', value: tune.value.toe_rear, unit: '°' },
    { label: 'Anti-Roll Bar Front', value: tune.value.antiroll_front, unit: '' },
    { label: 'Anti-Roll Bar Rear', value: tune.value.antiroll_rear, unit: '' },
    { label: 'Spring Front', value: tune.value.spring_front, unit: 'N/mm' },
    { label: 'Spring Rear', value: tune.value.spring_rear, unit: 'N/mm' },
    { label: 'Ride Height Front', value: tune.value.ride_height_front, unit: 'cm' },
    { label: 'Ride Height Rear', value: tune.value.ride_height_rear, unit: 'cm' },
    { label: 'Brake Balance', value: tune.value.brake_balance, unit: '% front' },
    { label: 'Brake Pressure', value: tune.value.brake_pressure, unit: '%' },
    { label: 'Diff Accel', value: tune.value.diff_accel, unit: '%' },
    { label: 'Diff Decel', value: tune.value.diff_decel, unit: '%' },
  ].filter(r => r.value != null)
})

const metaRows = computed(() => {
  if (!tune.value) return []
  return [
    { label: 'Vehicle', value: tune.value.vehicle_name },
    { label: 'PI Class', value: tune.value.pi_class },
    { label: 'Build Type', value: tune.value.build_type },
    { label: 'Driving Style', value: tune.value.driving_style },
    { label: 'Drivetrain', value: tune.value.drivetrain },
    { label: 'Share Code', value: tune.value.share_code },
  ].filter(r => r.value)
})

// ── Copy Tune ──
const copiedTune = ref(false)
function copyTune() {
  if (!tune.value) return
  const lines = []
  if (tune.value.title) lines.push(tune.value.title)
  if (tune.value.vehicle_name) lines.push(`Vehicle: ${tune.value.vehicle_name}`)
  if (tune.value.share_code) lines.push(`Share Code: ${tune.value.share_code}`)
  lines.push('')
  for (const r of tuneRows.value) {
    const v = typeof r.value === 'number' ? parseFloat(r.value.toFixed(3)).toString() : r.value
    lines.push(`${r.label}: ${v}${r.unit ? ' ' + r.unit : ''}`)
  }
  if (tune.value.notes) {
    lines.push('')
    lines.push(`Notes: ${tune.value.notes}`)
  }
  const text = lines.join('\n')
  navigator.clipboard.writeText(text).then(() => {
    copiedTune.value = true
    success('Tune copied')
    setTimeout(() => { copiedTune.value = false }, 1500)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copiedTune.value = true
    success('Tune copied')
    setTimeout(() => { copiedTune.value = false }, 1500)
  })
}

// ── Copy Link ──
const copiedLink = ref(false)
const copyLinkHint = ref('')
function copyLink() {
  copyLinkHint.value = ''
  if (tune.value?.is_public !== true && !isAuthor.value) {
    copyLinkHint.value = 'This tune is private. Make it public before sharing.'
    return
  }
  const url = window.location.href
  navigator.clipboard.writeText(url).then(() => {
    copiedLink.value = true
    success('Share link copied')
    setTimeout(() => { copiedLink.value = false }, 1500)
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = url
    ta.style.position = 'fixed'; ta.style.opacity = '0'
    document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
    copiedLink.value = true
    success('Share link copied')
    setTimeout(() => { copiedLink.value = false }, 1500)
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
</script>

<template>
  <div class="public-tune">
    <!-- Loading skeleton -->
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

      <!-- Hero -->
      <div class="pt-hero liquid-panel">
        <h1 class="pt-title">{{ tune.title || tune.personality_title || 'Forza Tune' }}</h1>
        <div class="pt-meta">
          <span v-if="tune.vehicle_name" class="pt-vehicle">{{ tune.vehicle_name }}</span>
        </div>
        <div v-if="metaRows.length > 0" class="pt-tags">
          <span v-for="m in metaRows" :key="m.label" class="pt-tag liquid-glass">{{ m.value }}</span>
        </div>
        <p v-if="tune.notes" class="pt-notes">{{ tune.notes }}</p>
      </div>

      <!-- Tune Values -->
      <div v-if="tuneRows.length > 0" class="pt-values liquid-panel">
        <div class="pt-values-inner">
          <h2 class="pt-section-title">Tune Values</h2>
          <div class="pt-values-grid">
            <div v-for="row in tuneRows" :key="row.label" class="pt-value-row">
              <span class="pt-value-label">{{ row.label }}</span>
              <span class="pt-value-num">
                {{ typeof row.value === 'number' ? parseFloat(row.value.toFixed(3)) : row.value }}<span v-if="row.unit" class="pt-value-unit"> {{ row.unit }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
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
  max-width: 640px;
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
  color: #0f1720;
  margin: 0;
}

.pt-state-desc {
  font-size: 0.85rem;
  color: #334155;
  font-weight: 500;
  margin: 0;
  line-height: 1.55;
}

.pt-spinner {
  animation: pt-spin 0.9s linear infinite;
  color: #4a6b85;
}

@keyframes pt-spin {
  to { transform: rotate(360deg); }
}

.pt-back-link {
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

.pt-back-link:hover {
  background: rgba(255, 255, 255, 0.35);
  color: #2d4a63;
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

/* ── Hero ── */
.pt-hero {
  padding: 32px 32px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  z-index: 2;
}

.pt-title {
  font-size: 1.4rem;
  font-weight: 720;
  color: #0f1720;
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.015em;
}

.pt-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pt-vehicle {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a6b85;
}

.pt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pt-tag {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #334155;
}

.pt-notes {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #334155;
  font-weight: 500;
  margin: 8px 0 0;
  white-space: pre-wrap;
}

/* ── Tune Values ── */
.pt-values {
  border-radius: 24px;
}

.pt-values-inner {
  position: relative;
  z-index: 2;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pt-section-title {
  font-size: 0.95rem;
  font-weight: 680;
  color: #0f1720;
  margin: 0;
}

.pt-values-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.pt-value-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.pt-value-label {
  font-size: 0.76rem;
  font-weight: 520;
  color: #556677;
}

.pt-value-num {
  font-size: 0.82rem;
  font-weight: 640;
  color: #0f1720;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.pt-value-unit {
  font-weight: 520;
  color: #8899aa;
}

/* ── Actions ── */
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

@media (max-width: 640px) {
  .public-tune {
    padding: 16px;
    padding-bottom: 60px;
    gap: 16px;
  }

  .pt-hero {
    padding: 24px 20px;
    border-radius: 20px;
    gap: 8px;
  }

  .pt-title {
    font-size: 1.2rem;
  }

  .pt-values-inner {
    padding: 22px 18px;
    gap: 12px;
  }

  .pt-values-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .pt-state-card {
    padding: 36px 24px;
  }

  .pt-actions {
    width: 100%;
  }

  .pt-btn {
    flex: 1;
    justify-content: center;
  }
}
</style>
