<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { supabase } from '../lib/supabase.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'

const router = useRouter()
const { user, loading: authLoading, signInWithMagicLink } = useAuth()

useSeoMeta({
  title: 'My Saved Builds | Forza Tuning Calculator',
  description: 'View and manage your saved Forza tuning builds.',
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

// ── Builds ──
const builds = ref([])
const loading = ref(false)
const error = ref(false)

async function loadBuilds() {
  if (!supabase || !user.value) return
  loading.value = true
  error.value = false
  try {
    const { data, err } = await supabase
      .from('saved_builds')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (err) {
      console.error('Builds load error:', err.message)
      error.value = true
      return
    }
    builds.value = data || []
  } catch (e) {
    console.error('Builds load failed:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

function buildTitle(b) {
  return b.title || b.vehicle_name || b.name || 'Saved Build'
}

function vehicleLabel(b) {
  const parts = [b.manufacturer, b.model].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : null
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function openBuild() {
  console.log('TODO: open build')
}

// ── Delete ──
const deleteTarget = ref(null)

function confirmDelete(b) {
  deleteTarget.value = b
}

function cancelDelete() {
  deleteTarget.value = null
}

async function executeDelete() {
  if (!supabase || !deleteTarget.value) return
  const build = deleteTarget.value
  try {
    const { err } = await supabase
      .from('saved_builds')
      .delete()
      .eq('id', build.id)

    if (err) {
      console.error('Delete error:', err.message)
      return
    }
    builds.value = builds.value.filter((b) => b.id !== build.id)
  } catch (e) {
    console.error('Delete failed:', e)
  } finally {
    deleteTarget.value = null
  }
}

// ── Lifecycle ──
onMounted(() => {
  if (user.value) loadBuilds()
})

watch(user, (u) => {
  if (u) loadBuilds()
  else builds.value = []
})
</script>

<template>
  <div class="builds-page">
    <!-- ═══════════════════════════════════════════
         UNAUTHENTICATED
         ═══════════════════════════════════════════ -->
    <div v-if="!authLoading && !user" class="builds-container liquid-panel">
      <div class="builds-content">
        <h1 class="page-heading">My Saved Builds</h1>
        <p class="section-desc">
          Sign in to view your saved builds.
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
      <h1 class="page-heading">My Saved Builds</h1>

      <!-- Error -->
      <div v-if="error" class="builds-container liquid-panel">
        <div class="builds-content state-center">
          <p class="state-text">Unable to load saved builds</p>
          <button class="btn-primary" @click="loadBuilds">Retry</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="builds-container liquid-panel">
        <div class="builds-content state-center">
          <p class="section-loading">Loading...</p>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="builds.length === 0" class="builds-container liquid-panel">
        <div class="builds-content state-center">
          <p class="state-text">No saved builds yet</p>
          <button class="btn-primary" @click="router.push('/calculator')">
            Go To Calculator
          </button>
        </div>
      </div>

      <!-- Build list -->
      <div v-else class="builds-list">
        <div v-for="b in builds" :key="b.id" class="build-card liquid-panel">
          <div class="build-card-content">
            <div class="build-info">
              <span class="build-name">{{ buildTitle(b) }}</span>
              <span v-if="vehicleLabel(b)" class="build-vehicle">{{ vehicleLabel(b) }}</span>
              <span class="build-date">{{ formatDate(b.created_at) }}</span>
            </div>

            <div class="build-actions">
              <button class="btn-secondary" @click="openBuild">
                Open
              </button>
              <button class="btn-danger" @click="confirmDelete(b)">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-else class="builds-container liquid-panel">
      <div class="builds-content state-center">
        <p class="section-loading">Loading...</p>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         DELETE CONFIRMATION OVERLAY
         ═══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="confirm-overlay" @click.self="cancelDelete">
        <div class="confirm-modal liquid-panel">
          <p class="confirm-text">Delete this saved build?</p>
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
.builds-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 24px;
  padding-top: 48px;
  padding-bottom: 80px;
}

.page-heading {
  font-size: 1.6rem;
  font-weight: 720;
  color: #111111;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  text-align: center;
}

.section-desc {
  font-size: 0.88rem;
  line-height: 1.6;
  color: #222222;
  font-weight: 500;
  margin: 0;
}

.section-loading {
  font-size: 0.85rem;
  color: #333333;
  font-weight: 500;
}

/* ── Container ── */
.builds-container {
  width: 100%;
  max-width: 600px;
  border-radius: 24px;
}

.builds-content {
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
  color: #333333;
  font-weight: 500;
  margin: 0;
}

/* ── Build list ── */
.builds-list {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.build-card {
  border-radius: 16px;
}

.build-card-content {
  position: relative;
  z-index: 2;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.build-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.build-name {
  font-size: 0.9rem;
  font-weight: 620;
  color: #222222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.build-vehicle {
  font-size: 0.78rem;
  font-weight: 550;
  color: #4a6b85;
}

.build-date {
  font-size: 0.72rem;
  font-weight: 500;
  color: #333333;
}

.build-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
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
  color: #222222;
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

.login-sent {
  font-size: 0.88rem;
  line-height: 1.6;
  color: #222222;
  font-weight: 500;
  margin: 0;
}

.login-sent-sub {
  font-size: 0.78rem;
  color: #333333;
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
  background: rgba(10, 18, 32, 0.30);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
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
  color: #222222;
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
  color: #333333;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.36);
  cursor: pointer;
  font-family: inherit;
}

.confirm-cancel:hover {
  background: rgba(255, 255, 255, 0.34);
  border-color: rgba(255, 255, 255, 0.48);
  color: #222222;
}

@media (max-width: 640px) {
  .builds-page {
    padding: 16px;
    padding-top: 32px;
    padding-bottom: 60px;
    gap: 16px;
  }

  .page-heading {
    font-size: 1.35rem;
  }

  .builds-container {
    border-radius: 20px;
  }

  .builds-content {
    padding: 24px 20px;
    gap: 14px;
  }

  .build-card-content {
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .build-actions {
    width: 100%;
  }
}
</style>
