<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'
import { getMyTunes, deleteTune, duplicateTune } from '../lib/tunesApi.js'
import { exportTuneToJson } from '../utils/tuneExport.js'
import { useToast } from '../composables/useToast.js'

const router = useRouter()
const { user, loading: authLoading, signInWithMagicLink } = useAuth()
const { success } = useToast()

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
    success('Tune deleted')
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
    success('Tune duplicated')
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
              class="btn-primary"
              style="width:100%;justify-content:center;"
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
        <button class="btn-primary" @click="router.push('/calculator')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Tune
        </button>
      </div>


      <!-- Error -->
      <div v-if="error" class="tunes-container liquid-panel">
        <div class="tunes-content state-center">
          <p class="state-text">Unable to load tunes</p>
          <button class="btn-primary" @click="loadTunes">Retry</button>
        </div>
      </div>

      <!-- Loading skeletons -->
      <div v-else-if="loading" class="tunes-list">
        <div v-for="n in 4" :key="n" class="tune-card skeleton-card liquid-panel">
          <div class="tune-card-content">
            <div class="skeleton-lines">
              <div class="skeleton-line w-60"></div>
              <div class="skeleton-line w-40"></div>
              <div class="skeleton-line w-30"></div>
            </div>
            <div class="skeleton-actions">
              <div class="skeleton-btn"></div>
              <div class="skeleton-btn"></div>
              <div class="skeleton-btn"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="tunes.length === 0" class="tunes-container liquid-panel">
        <div class="tunes-content state-center">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <p class="state-text">No tunes yet</p>
          <p class="state-sub">Create your first tune to get started.</p>
          <button class="btn-primary" @click="router.push('/calculator')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Start Tuning
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
                <span :class="['badge', t.is_public === false ? 'badge-private' : 'badge-public']">
                  {{ t.is_public === false ? 'Private' : 'Public' }}
                </span>
              </div>
              <span v-if="t.vehicle_name" class="tune-vehicle">{{ t.vehicle_name }}</span>
              <div class="tune-tags">
                <span v-for="tag in tuneTags(t)" :key="tag" class="badge badge-tag">{{ tag }}</span>
              </div>
              <span class="tune-date">{{ formatDate(t.created_at) }}</span>
            </div>

            <div class="tune-actions">
              <button
                class="btn-secondary"
                :disabled="!t.slug"
                @click="openTune(t)"
              >
                Open
              </button>
              <button class="btn-secondary" @click="editTune(t)">Edit</button>
              <button class="btn-secondary" :disabled="duplicating === t.id" @click="handleDuplicate(t)">
                {{ duplicating === t.id ? '...' : 'Duplicate' }}
              </button>
              <button class="btn-secondary" @click="handleExport(t)">Export</button>
              <button class="btn-danger" @click="confirmDelete(t)">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading (unauthenticated) -->
    <div v-else class="tunes-list">
      <div v-for="n in 3" :key="n" class="tune-card skeleton-card liquid-panel">
        <div class="tune-card-content">
          <div class="skeleton-lines">
            <div class="skeleton-line w-60"></div>
            <div class="skeleton-line w-40"></div>
          </div>
        </div>
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
            <button class="btn-danger" @click="executeDelete">Delete</button>
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

.section-desc {
  font-size: 0.88rem;
  line-height: 1.6;
  color: #334155;
  font-weight: 500;
  margin: 0;
}

.empty-icon {
  color: #8b95a1;
  opacity: 0.6;
}

.state-sub {
  font-size: 0.82rem;
  color: #8b95a1;
  font-weight: 500;
  margin: 0;
}

/* ── Skeleton loading ── */
.skeleton-card {
  opacity: 0.6;
  pointer-events: none;
}

.skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: rgba(139, 149, 161, 0.2);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-30 { width: 30%; }

.skeleton-actions {
  display: flex;
  gap: 6px;
}

.skeleton-btn {
  width: 52px;
  height: 28px;
  border-radius: 8px;
  background: rgba(139, 149, 161, 0.18);
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tune-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.5);
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

/* ── Login form ── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.login-input { width: 100%; }

.login-error {
  font-size: 0.78rem;
  color: #b85b5b;
  font-weight: 550;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.14);
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
