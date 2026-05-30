<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'
import { getMyTunes, deleteTune, duplicateTune } from '../lib/tunesApi.js'
import { exportTuneToJson } from '../utils/tuneExport.js'

const router = useRouter()
const { user, loading: authLoading, signInWithMagicLink } = useAuth()

useSeoMeta({
  title: 'My Tunes | Forza Tuning Calculator',
  description: 'View and manage your published and saved Forza tunes.',
  ogType: 'website',
})

// ── Login form (unauthenticated) ──
const email = ref('')
const sending = ref(false)
const sent = ref(false)
const loginError = ref('')

async function handleSendLink() {
  loginError.value = ''
  if (!email.value.trim()) {
    loginError.value = 'Please enter your email address.'
    return
  }
  sending.value = true
  try {
    await signInWithMagicLink(email.value.trim())
    sent.value = true
  } catch (e) {
    loginError.value = e.message || 'Failed to send link.'
  } finally {
    sending.value = false
  }
}

// ── Tunes ──
const tunes = ref([])
const loading = ref(false)
const error = ref(false)
const actionStatus = ref('')

async function loadTunes() {
  if (!user.value) return
  loading.value = true
  error.value = false
  try {
    tunes.value = await getMyTunes(user.value.id)
  } catch (e) {
    console.error('MyTunes load error:', e.message)
    error.value = true
  } finally {
    loading.value = false
  }
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function tuneTitle(t) {
  return t.title || t.personality_title || t.vehicle_name || 'Untitled Tune'
}

function tuneTags(t) {
  return [t.class_tier, t.build_type, t.driving_style, t.drivetrain].filter(Boolean)
}

function openTune(t) {
  if (!t.slug) return
  router.push(`/tunes/${t.slug}`)
}

function editTune(t) {
  router.push(`/account/tunes/${t.id}/edit`)
}

// ── Delete ──
const deleteTarget = ref(null)

function confirmDelete(t) {
  deleteTarget.value = t
}

function cancelDelete() {
  deleteTarget.value = null
}

async function executeDelete() {
  if (!deleteTarget.value) return
  const t = deleteTarget.value
  try {
    await deleteTune(t.id, user.value.id)
    tunes.value = tunes.value.filter((b) => b.id !== t.id)
    actionStatus.value = 'deleted'
    setTimeout(() => { actionStatus.value = '' }, 2000)
  } catch (e) {
    console.error('Delete error:', e.message)
  } finally {
    deleteTarget.value = null
  }
}

// ── Duplicate ──
const duplicating = ref(null)

async function handleDuplicate(t) {
  duplicating.value = t.id
  try {
    const dup = await duplicateTune(t.id, user.value.id)
    await loadTunes()
    actionStatus.value = 'duplicated'
    setTimeout(() => { actionStatus.value = '' }, 2000)
  } catch (e) {
    console.error('Duplicate error:', e.message)
  } finally {
    duplicating.value = null
  }
}

function handleExport(t) {
  exportTuneToJson(t)
}

// ── Lifecycle ──
onMounted(() => {
  if (user.value) loadTunes()
})

watch(user, (u) => {
  if (u) loadTunes()
  else tunes.value = []
})
</script>

<template>
  <div class="tunes-page">
    <!-- ═══════════════════════════════════════════
         UNAUTHENTICATED
         ═══════════════════════════════════════════ -->
    <div v-if="!authLoading && !user" class="tunes-container liquid-panel">
      <div class="tunes-content">
        <h1 class="page-heading">My Tunes</h1>
        <p class="section-desc">
          Sign in to view your published and saved tunes.
        </p>

        <template v-if="!sent">
          <div class="login-form">
            <input
              v-model="email"
              type="email"
              class="login-input input-glass"
              placeholder="you@email.com"
              @keydown.enter="handleSendLink"
            />
            <div v-if="loginError" class="login-error">{{ loginError }}</div>
            <button
              class="login-btn btn-glass"
              :disabled="sending"
              @click="handleSendLink"
            >
              {{ sending ? 'Sending...' : 'Sign In' }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="login-sent">
            Check your inbox. We sent a magic link to <strong>{{ email }}</strong>.
          </p>
          <p class="login-sent-sub">
            You can close this tab after clicking the link.
          </p>
        </template>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         AUTHENTICATED
         ═══════════════════════════════════════════ -->
    <template v-else-if="user">
      <div class="page-header">
        <h1 class="page-heading">My Tunes</h1>
        <button class="new-tune-btn btn-glass" @click="router.push('/calculator')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Tune
        </button>
      </div>

      <div v-if="actionStatus" class="action-toast">{{ actionStatus === 'deleted' ? 'Tune deleted' : 'Tune duplicated' }}</div>

      <!-- Error -->
      <div v-if="error" class="tunes-container liquid-panel">
        <div class="tunes-content state-center">
          <p class="state-text">Unable to load tunes</p>
          <button class="state-btn btn-glass" @click="loadTunes">Retry</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="tunes-container liquid-panel">
        <div class="tunes-content state-center">
          <p class="section-loading">Loading...</p>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="tunes.length === 0" class="tunes-container liquid-panel">
        <div class="tunes-content state-center">
          <p class="state-text">No tunes yet</p>
          <button class="state-btn btn-glass" @click="router.push('/calculator')">
            Create Your First Tune
          </button>
        </div>
      </div>

      <!-- Tune list -->
      <div v-else class="tunes-list">
        <div v-for="t in tunes" :key="t.id" class="tune-card liquid-panel">
          <div class="tune-card-content">
            <div class="tune-info" @click="openTune(t)">
              <div class="tune-title-row">
                <span class="tune-name">{{ tuneTitle(t) }}</span>
                <span class="tune-visibility-badge" :class="t.is_public === false ? 'badge-private' : 'badge-public'">
                  {{ t.is_public === false ? 'Private' : 'Public' }}
                </span>
              </div>
              <span v-if="t.vehicle_name" class="tune-vehicle">{{ t.vehicle_name }}</span>
              <div class="tune-tags">
                <span v-for="tag in tuneTags(t)" :key="tag" class="tune-tag">{{ tag }}</span>
              </div>
              <span class="tune-date">{{ formatDate(t.created_at) }}</span>
            </div>

            <div class="tune-actions">
              <button
                class="tune-btn tune-btn-open liquid-glass"
                :class="{ 'tune-btn-disabled': !t.slug }"
                :title="!t.slug ? 'Missing slug' : ''"
                :disabled="!t.slug"
                @click="openTune(t)"
              >
                {{ t.slug ? 'Open' : 'Missing slug' }}
              </button>
              <button class="tune-btn tune-btn-edit" @click="editTune(t)">
                Edit
              </button>
              <button
                class="tune-btn tune-btn-dupe"
                :disabled="duplicating === t.id"
                @click="handleDuplicate(t)"
              >
                {{ duplicating === t.id ? '...' : 'Duplicate' }}
              </button>
              <button class="tune-btn tune-btn-export" @click="handleExport(t)">
                Export
              </button>
              <button class="tune-btn tune-btn-delete" @click="confirmDelete(t)">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-else class="tunes-container liquid-panel">
      <div class="tunes-content state-center">
        <p class="section-loading">Loading...</p>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         DELETE CONFIRMATION OVERLAY
         ═══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="confirm-overlay" @click.self="cancelDelete">
        <div class="confirm-modal liquid-panel">
          <p class="confirm-text">Delete this tune?</p>
          <div class="confirm-actions">
            <button class="confirm-cancel" @click="cancelDelete">Cancel</button>
            <button class="confirm-delete btn-glass" @click="executeDelete">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tunes-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px;
  padding-top: 48px;
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 640px;
}

.page-heading {
  font-size: 1.6rem;
  font-weight: 720;
  color: #0f1720;
  letter-spacing: -0.02em;
  margin: 0;
}

.new-tune-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: 14px;
  font-size: 0.85rem;
}

.section-desc {
  font-size: 0.88rem;
  line-height: 1.6;
  color: #334155;
  font-weight: 500;
  margin: 0;
}

.section-loading {
  font-size: 0.85rem;
  color: #7b8ea0;
  font-weight: 500;
}

/* ── Toast ── */
.action-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  padding: 10px 24px;
  border-radius: 14px;
  background: rgba(15, 23, 32, 0.85);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* ── Container ── */
.tunes-container {
  width: 100%;
  max-width: 640px;
  border-radius: 24px;
}

.tunes-content {
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

/* ── Tune list ── */
.tunes-list {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tune-card {
  border-radius: 16px;
}

.tune-card-content {
  position: relative;
  z-index: 2;
  padding: 18px 22px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.tune-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
  cursor: pointer;
}

.tune-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tune-name {
  font-size: 0.9rem;
  font-weight: 620;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tune-visibility-badge {
  font-size: 0.58rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.badge-public {
  color: #3d6a4a;
  background: rgba(91, 138, 106, 0.1);
  border: 1px solid rgba(91, 138, 106, 0.2);
}

.badge-private {
  color: #8b6a4a;
  background: rgba(194, 154, 74, 0.1);
  border: 1px solid rgba(194, 154, 74, 0.18);
}

.tune-vehicle {
  font-size: 0.78rem;
  font-weight: 550;
  color: #4a6b85;
}

.tune-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.tune-tag {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.62rem;
  font-weight: 600;
  color: #334155;
  background: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.tune-date {
  font-size: 0.7rem;
  font-weight: 500;
  color: #8b95a1;
  margin-top: 2px;
}

.tune-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}

.tune-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tune-btn-open {
  color: #4a6b85;
  border: 1px solid rgba(74, 107, 133, 0.14);
  background: rgba(255, 255, 255, 0.28);
}

.tune-btn-open:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.42);
  color: #2d4a63;
}

.tune-btn-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tune-btn-edit {
  color: #5b7a9a;
  background: rgba(91, 122, 154, 0.06);
  border: 1px solid rgba(91, 122, 154, 0.14);
}

.tune-btn-edit:hover {
  background: rgba(91, 122, 154, 0.14);
  color: #3d5c73;
}

.tune-btn-dupe {
  color: #6b8a5b;
  background: rgba(107, 138, 91, 0.06);
  border: 1px solid rgba(107, 138, 91, 0.14);
}

.tune-btn-dupe:hover {
  background: rgba(107, 138, 91, 0.14);
  color: #4a6a3a;
}

.tune-btn-dupe:disabled {
  opacity: 0.5;
  cursor: default;
}

.tune-btn-export {
  color: #6b8a5b;
  background: rgba(107, 138, 91, 0.06);
  border: 1px solid rgba(107, 138, 91, 0.14);
}

.tune-btn-export:hover {
  background: rgba(107, 138, 91, 0.14);
  color: #4a6a3a;
}

.tune-btn-delete {
  color: #b85b5b;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.1);
}

.tune-btn-delete:hover {
  background: rgba(184, 91, 91, 0.12);
  color: #9a3e3e;
}

/* ── Login form ── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-input {
  padding: 11px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #2d3748;
  font-family: inherit;
  width: 100%;
}

.login-error {
  font-size: 0.78rem;
  color: #b85b5b;
  font-weight: 550;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.14);
}

.login-btn {
  width: 100%;
  justify-content: center;
  padding: 13px 24px;
  border-radius: 14px;
  font-size: 0.9rem;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
}

.login-sent {
  font-size: 0.88rem;
  line-height: 1.6;
  color: #334155;
  font-weight: 500;
  margin: 0;
}

.login-sent-sub {
  font-size: 0.78rem;
  color: #8b95a1;
  margin: 0;
}

/* ── Delete confirmation ── */
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 18, 32, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 20px;
}

.confirm-modal {
  width: 100%;
  max-width: 320px;
  border-radius: 18px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.confirm-text {
  font-size: 0.9rem;
  font-weight: 580;
  color: #1f2937;
  margin: 0;
  position: relative;
  z-index: 2;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  position: relative;
  z-index: 2;
}

.confirm-cancel {
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7d92;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-family: inherit;
}

.confirm-cancel:hover {
  background: rgba(255, 255, 255, 0.32);
  color: #334155;
}

.confirm-delete {
  padding: 9px 22px;
  border-radius: 10px;
  font-size: 0.8rem;
  background: linear-gradient(180deg, #c46b6b 0%, #a84e4e 50%, #8b3a3a 100%);
}

@media (max-width: 640px) {
  .tunes-page {
    padding: 16px;
    padding-top: 32px;
    padding-bottom: 60px;
    gap: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-heading {
    font-size: 1.35rem;
  }

  .tunes-container {
    border-radius: 20px;
  }

  .tunes-content {
    padding: 24px 20px;
    gap: 14px;
  }

  .tune-card-content {
    padding: 14px 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .tune-actions {
    width: 100%;
  }

  .tune-btn {
    flex: 1;
    text-align: center;
    justify-content: center;
    padding: 9px 12px;
  }
}
</style>
