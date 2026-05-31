<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../composables/useAuth.js'
import { saveTune } from '../lib/tunesApi.js'
import { useI18n } from '../i18n/index.js'
import VehicleSelector from './VehicleSelector.vue'

const props = defineProps({
  build: { type: Object, required: true },
  tuneResult: { type: Object, default: null },
})

const emit = defineEmits(['close', 'published'])

const { user } = useAuth()
const { t } = useI18n()

const title = ref(props.build.personalityTitle || '')
const vehicleId = ref(null)
const vehicleDisplayName = ref('')
const shareCode = ref('')
const gameMode = ref(props.build.buildType || 'Road')
const classTier = ref(props.build.classTier || 'A')
const drivetrain = ref(props.build.drivetrain || 'AWD')
const description = ref('')
const tags = ref([])
const tagInput = ref('')

const publishing = ref(false)
const publishError = ref('')
const publishedSlug = ref('')

const gameModes = ['Road', 'Drift', 'Dirt', 'Drag']
const classOptions = ['D', 'C', 'B', 'A', 'S1', 'S2', 'X']
const drivetrainOptions = ['FWD', 'RWD', 'AWD']

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
  if (classTier.value) parts.push(classTier.value.toLowerCase())
  parts.push(gameMode.value.toLowerCase())
  parts.push(drivetrain.value.toLowerCase())
  return parts.join('-')
})

const descTooShort = computed(() => description.value.trim().length > 0 && description.value.trim().length < 20)

function addTag() {
  const val = tagInput.value.trim().toLowerCase()
  if (!val) return
  if (tags.value.includes(val)) { tagInput.value = ''; return }
  if (tags.value.length >= 5) return
  tags.value.push(val)
  tagInput.value = ''
}

function removeTag(index) {
  tags.value.splice(index, 1)
}

function onTagKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addTag()
  }
}

async function handlePublish() {
  if (!supabase) return
  if (!user.value) {
    publishError.value = t('tunes.loginRequired')
    return
  }
  if (!title.value.trim()) {
    publishError.value = 'Title is required.'
    return
  }
  if (description.value.trim().length < 20) {
    publishError.value = t('tunes.descMinLength')
    return
  }

  publishing.value = true
  publishError.value = ''

  try {
    const tuneData = {
      user_id: user.value.id,
      slug: generatedSlug.value || 'tune',
      title: title.value.trim(),
      description: description.value.trim(),
      vehicle_id: vehicleId.value || null,
      vehicle_name: vehicleDisplayName.value || null,
      author_name: user.value.email || null,
      share_code: shareCode.value.trim() || null,
      game_mode: gameMode.value,
      build_type: props.build.buildType,
      driving_style: props.build.drivingStyle,
      drivetrain: drivetrain.value,
      power_hp: props.build.powerHp,
      weight_kg: props.build.weightKg,
      class_tier: classTier.value,
      front_weight_pct: props.build.frontWeightPercent,
      personality_title: props.build.personalityTitle,
      tags: tags.value.length > 0 ? tags.value.join(',') : null,
      tune_data: {
        form: {
          drivetrain: drivetrain.value,
          buildType: props.build.buildType,
          drivingStyle: props.build.drivingStyle,
          classTier: classTier.value,
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
        <h2 class="pd-title">{{ t('tunes.publishTitle') }}</h2>
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
        <span>{{ t('tunes.loginRequired') }}</span>
      </div>

      <!-- Publish form -->
      <template v-else-if="!publishedSlug">
        <div class="pd-body">
          <!-- Title -->
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

          <!-- Vehicle -->
          <div class="pd-field">
            <VehicleSelector v-model="vehicleId" @select="onVehicleSelect" />
          </div>

          <!-- Share Code -->
          <label class="pd-field">
            <span class="pd-label">{{ t('tunes.shareCode') }}</span>
            <input
              v-model="shareCode"
              type="text"
              class="pd-input input-glass pd-share-code"
              :placeholder="t('tunes.shareCodePlaceholder')"
              maxlength="50"
            />
          </label>

          <!-- Game Mode + Class row -->
          <div class="pd-row">
            <label class="pd-field pd-field-half">
              <span class="pd-label">{{ t('tunes.gameMode') }}</span>
              <select v-model="gameMode" class="pd-select input-glass">
                <option v-for="m in gameModes" :key="m" :value="m">{{ t(`tunes.gameMode${m}`) }}</option>
              </select>
            </label>
            <label class="pd-field pd-field-half">
              <span class="pd-label">{{ t('tunes.classLabel') }}</span>
              <select v-model="classTier" class="pd-select input-glass">
                <option v-for="c in classOptions" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
          </div>

          <!-- Drivetrain -->
          <label class="pd-field">
            <span class="pd-label">Drivetrain</span>
            <div class="pd-radio-group">
              <label v-for="d in drivetrainOptions" :key="d" class="pd-radio">
                <input type="radio" :value="d" v-model="drivetrain" />
                <span class="pd-radio-label">{{ d }}</span>
              </label>
            </div>
          </label>

          <!-- Description -->
          <label class="pd-field">
            <span class="pd-label">Description <span class="pd-required">*</span></span>
            <textarea
              v-model="description"
              class="pd-textarea input-glass"
              placeholder="Describe your tune setup... (min 20 characters)"
              rows="3"
              maxlength="500"
            ></textarea>
            <span class="pd-char-count" :class="{ 'pd-char-warn': descTooShort }">
              {{ description.length }} / 500 — {{ description.length < 20 ? `${20 - description.length} more needed` : '✓' }}
            </span>
          </label>

          <!-- Tags -->
          <label class="pd-field">
            <span class="pd-label">{{ t('tunes.tagLabel') }}</span>
            <div class="pd-tags-wrap">
              <span v-for="(tag, i) in tags" :key="i" class="pd-tag-chip">
                {{ tag }}
                <button class="pd-tag-remove" @click="removeTag(i)">&times;</button>
              </span>
              <input
                v-if="tags.length < 5"
                v-model="tagInput"
                type="text"
                class="pd-tag-input"
                :placeholder="t('tunes.tagPlaceholder')"
                @keydown="onTagKeydown"
              />
            </div>
            <span class="pd-field-hint">{{ t('tunes.tagHint') }} · {{ tags.length }} / 5</span>
          </label>

          <!-- URL preview -->
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
            {{ publishing ? 'Publishing...' : t('tunes.publishTune') }}
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
        <span class="pd-success-text">{{ t('tunes.publishSuccess') }}</span>
        <router-link :to="`/tunes/${publishedSlug}`" class="pd-view-link btn-glass" @click="emit('close')">
          {{ t('tunes.viewTune') }}
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
  max-width: 480px;
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
  color: #111827;
  margin: 0;
}

.pd-close {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4B5563;
  cursor: pointer;
  transition: all 0.15s ease;
  background: transparent;
  border: none;
}

.pd-close:hover {
  background: rgba(0, 0, 0, 0.04);
  color: #111827;
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

.pd-field-half {
  flex: 1;
  min-width: 0;
}

.pd-label {
  font-size: 0.72rem;
  font-weight: 620;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.pd-required {
  color: #b85b5b;
}

.pd-field-hint {
  font-size: 0.64rem;
  font-weight: 520;
  color: #6b859e;
  margin-top: 2px;
}

.pd-input {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #111827;
  font-family: inherit;
  width: 100%;
}

.pd-share-code {
  font-family: monospace;
  letter-spacing: 0.05em;
  font-size: 0.90rem;
}

.pd-select {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.86rem;
  color: #111827;
  font-family: inherit;
  width: 100%;
}

.pd-row {
  display: flex;
  gap: 12px;
}

.pd-radio-group {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.pd-radio {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.pd-radio input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.pd-radio-label {
  display: block;
  width: 100%;
  text-align: center;
  padding: 8px 4px;
  border-radius: 10px;
  font-size: 0.76rem;
  font-weight: 620;
  color: #4B5563;
  transition: all 0.15s ease;
}

.pd-radio input:checked + .pd-radio-label {
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.pd-textarea {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  color: #111827;
  font-family: inherit;
  width: 100%;
  resize: vertical;
  min-height: 70px;
}

.pd-char-count {
  font-size: 0.64rem;
  font-weight: 520;
  color: #6b859e;
  text-align: right;
}

.pd-char-warn {
  color: #b85b5b;
}

/* ── Tags ── */
.pd-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.01);
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-height: 42px;
}

.pd-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #374151;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(74, 107, 133, 0.16);
}

.pd-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.08);
  color: #4B5563;
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.pd-tag-remove:hover {
  background: rgba(184, 91, 91, 0.15);
  color: #b85b5b;
}

.pd-tag-input {
  border: none;
  outline: none;
  font-size: 0.80rem;
  font-family: inherit;
  color: #111827;
  background: transparent;
  min-width: 120px;
  flex: 1;
  padding: 4px 2px;
}

.pd-tag-input::placeholder {
  color: #9ca3af;
}

/* ── Slug preview ── */
.pd-slug-preview {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.pd-slug-label {
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b859e;
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
  color: #4B5563;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.pd-btn-cancel:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #111827;
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
  color: #111827;
}

.pd-view-link {
  padding: 10px 28px;
  border-radius: 12px;
  font-size: 0.85rem;
  text-decoration: none;
}

@media (max-width: 480px) {
  .publish-dialog {
    padding: 20px 16px;
    border-radius: 20px;
    gap: 16px;
  }

  .pd-title {
    font-size: 0.95rem;
  }

  .pd-row {
    flex-direction: column;
    gap: 14px;
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
