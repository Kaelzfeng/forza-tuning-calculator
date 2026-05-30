<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../composables/useAuth.js'
import { saveTune } from '../lib/tunesApi.js'
import VehicleSelector from './VehicleSelector.vue'

const props = defineProps({
  build: { type: Object, required: true },
  tuneResult: { type: Object, default: null },
})

const emit = defineEmits(['close', 'published'])

const { user, profile } = useAuth()

const title = ref(props.build.personalityTitle || '')
const vehicleId = ref(null)
const vehicleDisplayName = ref('')
const description = ref('')
const publishing = ref(false)
const publishError = ref('')
const publishedSlug = ref('')
const slugCheck = ref('')

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-+/g, '-')
}

function onVehicleSelect(vehicle) {
  vehicleDisplayName.value = `${vehicle.manufacturer} ${vehicle.name}`
}

const generatedSlug = computed(() => {
  const parts = []
  const nameSource = vehicleDisplayName.value || ''
  if (nameSource.trim()) parts.push(slugify(nameSource.trim()))
  if (props.build.classTier) parts.push(props.build.classTier.toLowerCase())
  parts.push(props.build.buildType.toLowerCase())
  parts.push(props.build.drivingStyle.toLowerCase().replace(/\s+/g, '-'))
  return parts.join('-')
})

async function handlePublish() {
  if (!supabase) return
  if (!user.value) {
    publishError.value = 'Login required'
    return
  }
  if (!title.value.trim()) {
    publishError.value = 'Title is required.'
    return
  }

  publishing.value = true
  publishError.value = ''
  slugCheck.value = ''

  try {
    const tuneData = {
      user_id: user.value.id,
      slug: generatedSlug.value || 'tune',
      title: title.value.trim(),
      description: description.value.trim() || null,
      vehicle_id: vehicleId.value || null,
      vehicle_name: vehicleDisplayName.value || null,
      author_name: user.value.email || null,
      build_type: props.build.buildType,
      driving_style: props.build.drivingStyle,
      drivetrain: props.build.drivetrain,
      power_hp: props.build.powerHp,
      weight_kg: props.build.weightKg,
      class_tier: props.build.classTier,
      front_weight_pct: props.build.frontWeightPercent,
      personality_title: props.build.personalityTitle,
      tune_data: {
        form: {
          drivetrain: props.build.drivetrain,
          buildType: props.build.buildType,
          drivingStyle: props.build.drivingStyle,
          classTier: props.build.classTier,
          weightKg: props.build.weightKg,
          powerHp: props.build.powerHp,
          frontWeightPercent: props.build.frontWeightPercent,
          tireCompound: props.build.tireCompound,
        },
        result: props.tuneResult || null,
        tuneMode: props.build.tuneMode,
        step1Intent: props.build.step1Intent,
        step2Intent: props.build.step2Intent,
        personalityTitle: props.build.personalityTitle,
      },
      share_query: null,
    }

    const data = await saveTune(tuneData)

    publishedSlug.value = data.slug
    emit('published', { publishedTuneId: data.id, publishedSlug: data.slug })
  } catch (e) {
    publishError.value = e.message || 'Failed to publish.'
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <div class="publish-overlay" @click.self="emit('close')">
    <div class="publish-dialog liquid-panel" @click.stop>
      <!-- Header -->
      <div class="pd-header">
        <h2 class="pd-title">Publish Tune</h2>
        <button class="pd-close" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Login gate -->
      <div v-if="!user" class="pd-login-gate">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>Login to publish your tunes</span>
      </div>

      <!-- Publish form -->
      <template v-else-if="!publishedSlug">
        <div class="pd-body">
          <label class="pd-field">
            <span class="pd-label">Title <span class="pd-required">*</span></span>
            <input
              v-model="title"
              type="text"
              class="pd-input input-glass"
              placeholder="e.g. Balanced R34 Baseline"
              maxlength="120"
            />
          </label>

          <div class="pd-field">
            <VehicleSelector v-model="vehicleId" @select="onVehicleSelect" />
          </div>

          <label class="pd-field">
            <span class="pd-label">Description</span>
            <textarea
              v-model="description"
              class="pd-textarea input-glass"
              placeholder="Optional notes about this tune..."
              rows="3"
              maxlength="300"
            ></textarea>
          </label>

          <div class="pd-slug-preview">
            <span class="pd-slug-label">URL preview</span>
            <span class="pd-slug-value">/tunes/{{ generatedSlug || '...' }}</span>
          </div>

          <div v-if="publishError" class="pd-error">{{ publishError }}</div>
        </div>

        <div class="pd-footer">
          <button class="pd-btn-cancel" @click="emit('close')">Cancel</button>
          <button class="pd-btn-publish btn-glass" :disabled="publishing" @click="handlePublish">
            <svg v-if="publishing" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="pd-spinner">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            {{ publishing ? 'Publishing...' : 'Publish' }}
          </button>
        </div>
      </template>

      <!-- Success -->
      <div v-else class="pd-success">
        <div class="pd-success-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span class="pd-success-text">Published!</span>
        <router-link :to="`/tunes/${publishedSlug}`" class="pd-view-link btn-glass" @click="emit('close')">
          View Tune
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.publish-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 18, 32, 0.30);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  padding: 20px;
}

.publish-dialog {
  width: 100%;
  max-width: 440px;
  padding: 24px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 201;
}

/* ── Header ── */
.pd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.pd-title {
  font-size: 1.05rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
}

.pd-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333333;
  cursor: pointer;
  transition: all 0.15s ease;
  background: transparent;
  border: none;
}

.pd-close:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #111111;
}

/* ── Login gate ── */
.pd-login-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 20px;
  color: #4a6b85;
  font-size: 0.88rem;
  font-weight: 550;
  position: relative;
  z-index: 2;
}

/* ── Body ── */
.pd-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.pd-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pd-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #222222;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pd-required {
  color: #b85b5b;
}

.pd-input {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #222222;
  font-family: inherit;
  width: 100%;
}

.pd-textarea {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #222222;
  font-family: inherit;
  width: 100%;
  resize: vertical;
  min-height: 60px;
}

.pd-slug-preview {
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.pd-slug-label {
  font-size: 0.6rem;
  font-weight: 600;
  color: #333333;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: block;
  margin-bottom: 3px;
}

.pd-slug-value {
  font-size: 0.75rem;
  font-weight: 550;
  color: #4a6b85;
  font-family: monospace;
}

.pd-error {
  font-size: 0.78rem;
  color: #b85b5b;
  font-weight: 550;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.14);
}

/* ── Footer ── */
.pd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  position: relative;
  z-index: 2;
}

.pd-btn-cancel {
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #333333;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.36);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.pd-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.34);
  border-color: rgba(255, 255, 255, 0.48);
  color: #222222;
}

.pd-btn-publish {
  padding: 10px 24px;
  border-radius: 12px;
  font-size: 0.82rem;
}

.pd-btn-publish:disabled {
  opacity: 0.65;
  cursor: default;
  transform: none;
}

.pd-spinner {
  animation: pd-spin 0.9s linear infinite;
}

@keyframes pd-spin {
  to { transform: rotate(360deg); }
}

/* ── Success ── */
.pd-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px 10px;
  position: relative;
  z-index: 2;
}

.pd-success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(91, 138, 106, 0.12);
  border: 2px solid rgba(91, 138, 106, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3d6a4a;
}

.pd-success-text {
  font-size: 0.95rem;
  font-weight: 650;
  color: #111111;
}

.pd-view-link {
  padding: 10px 28px;
  border-radius: 12px;
  font-size: 0.85rem;
  text-decoration: none;
}

@media (max-width: 480px) {
  .publish-dialog {
    padding: 20px 18px;
    border-radius: 20px;
    gap: 16px;
  }

  .pd-title {
    font-size: 0.95rem;
  }

  .pd-footer {
    flex-direction: column-reverse;
  }

  .pd-btn-cancel,
  .pd-btn-publish {
    width: 100%;
    justify-content: center;
  }
}
</style>
