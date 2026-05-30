<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'
import { getTuneById, updateTune } from '../lib/tunesApi.js'

const route = useRoute()
const router = useRouter()
const { user, loading: authLoading } = useAuth()

useSeoMeta({
  title: 'Edit Tune | Forza Tuning Calculator',
  description: 'Edit your tune settings and values.',
  ogType: 'website',
})

const tuneId = route.params.id

// ── States ──
const loading = ref(true)
const notFound = ref(false)
const accessDenied = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

// ── Form ──
const form = ref({
  title: '',
  share_code: '',
  pi_class: '',
  notes: '',
  is_public: true,
  tire_pressure_front: null,
  tire_pressure_rear: null,
  gear_final_drive: null,
  camber_front: null,
  camber_rear: null,
  toe_front: null,
  toe_rear: null,
  antiroll_front: null,
  antiroll_rear: null,
  spring_front: null,
  spring_rear: null,
  ride_height_front: null,
  ride_height_rear: null,
  brake_balance: null,
  brake_pressure: null,
  diff_accel: null,
  diff_decel: null,
})

const basicFields = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Balanced R34 Grip Tune' },
  { key: 'share_code', label: 'Share Code', type: 'text', placeholder: 'e.g. 123 456 789' },
  { key: 'pi_class', label: 'PI Class', type: 'text', placeholder: 'e.g. A800' },
  { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Tuning notes...' },
]

const tuneValueFields = [
  { key: 'tire_pressure_front', label: 'Tire Pressure Front', unit: 'psi' },
  { key: 'tire_pressure_rear', label: 'Tire Pressure Rear', unit: 'psi' },
  { key: 'gear_final_drive', label: 'Final Drive', unit: '' },
  { key: 'camber_front', label: 'Camber Front', unit: '°' },
  { key: 'camber_rear', label: 'Camber Rear', unit: '°' },
  { key: 'toe_front', label: 'Toe Front', unit: '°' },
  { key: 'toe_rear', label: 'Toe Rear', unit: '°' },
  { key: 'antiroll_front', label: 'Anti-Roll Bar Front', unit: '' },
  { key: 'antiroll_rear', label: 'Anti-Roll Bar Rear', unit: '' },
  { key: 'spring_front', label: 'Spring Front', unit: 'N/mm' },
  { key: 'spring_rear', label: 'Spring Rear', unit: 'N/mm' },
  { key: 'ride_height_front', label: 'Ride Height Front', unit: 'cm' },
  { key: 'ride_height_rear', label: 'Ride Height Rear', unit: 'cm' },
  { key: 'brake_balance', label: 'Brake Balance', unit: '% front' },
  { key: 'brake_pressure', label: 'Brake Pressure', unit: '%' },
  { key: 'diff_accel', label: 'Diff Accel', unit: '%' },
  { key: 'diff_decel', label: 'Diff Decel', unit: '%' },
]

function populateForm(tune) {
  for (const f of [...basicFields, ...tuneValueFields]) {
    const v = tune[f.key]
    form.value[f.key] = v !== undefined && v !== null ? v : (f.type === 'textarea' ? '' : f.key.startsWith('is_') ? true : null)
  }
  // ensure is_public is boolean
  form.value.is_public = tune.is_public !== false
}

// ── Load ──
async function loadTune() {
  loading.value = true
  try {
    const tune = await getTuneById(tuneId)
    if (!tune) {
      notFound.value = true
      return
    }
    if (tune.user_id !== user.value?.id) {
      accessDenied.value = true
      return
    }
    populateForm(tune)
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Save ──
async function handleSave() {
  saveError.value = ''
  saving.value = true
  try {
    const payload = {}
    for (const f of [...basicFields, ...tuneValueFields]) {
      payload[f.key] = form.value[f.key]
    }
    // Convert empty strings to null for numeric fields
    for (const f of tuneValueFields) {
      if (payload[f.key] === '' || payload[f.key] === undefined) {
        payload[f.key] = null
      } else if (typeof payload[f.key] === 'string') {
        payload[f.key] = parseFloat(payload[f.key])
      }
    }
    payload.is_public = form.value.is_public

    await updateTune(tuneId, user.value.id, payload)
    saved.value = true
    setTimeout(() => { saved.value = false }, 2500)
  } catch (e) {
    saveError.value = e.message || 'Failed to save.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (user.value) {
    loadTune()
  }
})

// Watch for auth loading completion
import { watch } from 'vue'
watch([authLoading, user], ([al, u]) => {
  if (!al && u && !loading.value && !notFound.value && !accessDenied.value) {
    loadTune()
  }
})
</script>

<template>
  <div class="edit-page">
    <div class="edit-header">
      <button class="back-btn" @click="router.push('/account/tunes')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        My Tunes
      </button>
    </div>

    <!-- ═══════ Loading ═══════ -->
    <div v-if="loading" class="edit-container liquid-panel">
      <div class="edit-content state-center">
        <p class="state-text">Loading tune...</p>
      </div>
    </div>

    <!-- ═══════ Not Found ═══════ -->
    <div v-else-if="notFound" class="edit-container liquid-panel">
      <div class="edit-content state-center">
        <p class="state-text">Tune not found.</p>
        <button class="state-btn btn-glass" @click="router.push('/account/tunes')">Back to My Tunes</button>
      </div>
    </div>

    <!-- ═══════ Access Denied ═══════ -->
    <div v-else-if="accessDenied" class="edit-container liquid-panel">
      <div class="edit-content state-center">
        <p class="state-text">Access denied &mdash; you can only edit your own tunes.</p>
        <button class="state-btn btn-glass" @click="router.push('/account/tunes')">Back to My Tunes</button>
      </div>
    </div>

    <!-- ═══════ Load Error ═══════ -->
    <div v-else-if="loadError" class="edit-container liquid-panel">
      <div class="edit-content state-center">
        <p class="state-text">{{ loadError }}</p>
        <button class="state-btn btn-glass" @click="loadTune">Retry</button>
      </div>
    </div>

    <!-- ═══════ Form ═══════ -->
    <template v-else>
      <!-- Success toast -->
      <div v-if="saved" class="save-toast">Tune updated</div>

      <form class="edit-form" @submit.prevent="handleSave">
        <!-- Basic section -->
        <section class="edit-section liquid-panel">
          <div class="section-content">
            <h2 class="section-title">Basic</h2>
            <div class="field-grid">
              <label v-for="f in basicFields" :key="f.key" class="field" :class="{ 'field-span': f.type === 'textarea' }">
                <span class="field-label">{{ f.label }}</span>
                <input
                  v-if="f.type !== 'textarea'"
                  v-model="form[f.key]"
                  :type="f.type === 'number' ? 'number' : 'text'"
                  class="field-input input-glass"
                  :placeholder="f.placeholder"
                  :step="f.type === 'number' ? 'any' : undefined"
                />
                <textarea
                  v-else
                  v-model="form[f.key]"
                  class="field-textarea input-glass"
                  :placeholder="f.placeholder"
                  rows="3"
                ></textarea>
              </label>
              <div class="public-toggle">
                <label class="field field-checkbox">
                  <input v-model="form.is_public" type="checkbox" class="field-check" />
                  <span class="field-label field-label-inline">Public Tune</span>
                </label>
                <p class="public-hint">When enabled, anyone with the link can view this tune.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Tune Values section -->
        <section class="edit-section liquid-panel">
          <div class="section-content">
            <h2 class="section-title">Tune Values</h2>
            <div class="field-grid field-grid-2col">
              <label v-for="f in tuneValueFields" :key="f.key" class="field">
                <span class="field-label">{{ f.label }}</span>
                <div class="field-with-unit">
                  <input
                    v-model.number="form[f.key]"
                    type="number"
                    class="field-input input-glass"
                    placeholder="--"
                    step="any"
                  />
                  <span v-if="f.unit" class="field-unit">{{ f.unit }}</span>
                </div>
              </label>
            </div>
          </div>
        </section>

        <!-- Save -->
        <div v-if="saveError" class="save-error">{{ saveError }}</div>
        <button type="submit" class="save-btn btn-glass" :disabled="saving">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.edit-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
}

.edit-header {
  width: 100%;
  max-width: 640px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.35);
  color: #2d4a63;
}

/* ── Container ── */
.edit-container {
  width: 100%;
  max-width: 640px;
  border-radius: 24px;
}

.edit-content {
  position: relative;
  z-index: 2;
  padding: 32px 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.state-center {
  align-items: center;
  text-align: center;
}

.state-text {
  font-size: 0.88rem;
  color: #8b95a1;
  font-weight: 500;
  margin: 0;
}

.state-btn {
  padding: 12px 28px;
  border-radius: 14px;
  font-size: 0.88rem;
  display: inline-flex;
}

/* ── Toast ── */
.save-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 10px 24px;
  border-radius: 14px;
  background: rgba(61, 106, 74, 0.92);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ── Form ── */
.edit-form {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.edit-section {
  border-radius: 24px;
}

.section-content {
  position: relative;
  z-index: 2;
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 680;
  color: #0f1720;
  margin: 0;
}

/* ── Fields ── */
.field-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-span {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-label-inline {
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
}

.field-input {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #2d3748;
  font-family: inherit;
  width: 100%;
}

.field-textarea {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #2d3748;
  font-family: inherit;
  width: 100%;
  resize: vertical;
  min-height: 60px;
}

.field-with-unit {
  position: relative;
}

.field-with-unit .field-input {
  padding-right: 48px;
}

.field-unit {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.72rem;
  font-weight: 580;
  color: #6b7d92;
  pointer-events: none;
}

.field-checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.public-toggle {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.public-hint {
  font-size: 0.74rem;
  font-weight: 500;
  color: #6b7d92;
  margin: 0;
  padding-left: 24px;
  line-height: 1.45;
}

.field-check {
  width: 16px;
  height: 16px;
  accent-color: #4a6b85;
  cursor: pointer;
}

/* ── Save ── */
.save-error {
  font-size: 0.8rem;
  color: #b85b5b;
  font-weight: 550;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.14);
}

.save-btn {
  width: 100%;
  justify-content: center;
  padding: 14px 24px;
  border-radius: 14px;
  font-size: 0.9rem;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
}

@media (max-width: 640px) {
  .edit-page {
    padding: 16px;
    padding-top: 24px;
    padding-bottom: 60px;
    gap: 16px;
  }

  .edit-section {
    border-radius: 20px;
  }

  .section-content {
    padding: 22px 18px;
    gap: 14px;
  }

  .field-grid-2col {
    grid-template-columns: 1fr;
  }
}
</style>
