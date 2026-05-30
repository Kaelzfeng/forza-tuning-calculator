<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useProAccess } from '../composables/useProAccess.js'
import { supabase } from '../lib/supabase.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'

const router = useRouter()
const { user, loading: authLoading, signInWithMagicLink } = useAuth()
const { isPro, profile, isActive, expiresAt, loading: subLoading } = useProAccess()

useSeoMeta({
  title: 'My Account | Forza Tuning Calculator',
  description: 'Manage your subscription, view saved builds, and favorite tunes.',
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

// ── Saved builds ──
const savedBuilds = ref([])
const buildsLoading = ref(false)
const buildsError = ref(false)

async function loadBuilds() {
  if (!supabase || !user.value) return
  buildsLoading.value = true
  buildsError.value = false
  try {
    const { data, error } = await supabase
      .from('saved_builds')
      .select('*')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Builds load error:', error.message)
      buildsError.value = true
      return
    }
    savedBuilds.value = data || []
  } catch (e) {
    console.error('Builds load failed:', e)
    buildsError.value = true
  } finally {
    buildsLoading.value = false
  }
}

function buildTitle(b) {
  return b.title || b.vehicle_name || b.name || 'Saved Build'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Favorites ──
const favorites = ref([])
const favsLoading = ref(false)
const favsError = ref(false)

async function loadFavorites() {
  if (!supabase || !user.value) return
  favsLoading.value = true
  favsError.value = false
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('*, vehicles(manufacturer, model, year)')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Favorites load error:', error.message)
      favsError.value = true
      return
    }
    favorites.value = data || []
  } catch (e) {
    console.error('Favorites load failed:', e)
    favsError.value = true
  } finally {
    favsLoading.value = false
  }
}

function favLabel(f) {
  if (f.vehicles) {
    const v = f.vehicles
    return [v.manufacturer, v.model, v.year].filter(Boolean).join(' ') || 'Vehicle'
  }
  return f.vehicle_id || 'Vehicle'
}

// ── Lifecycle ──
onMounted(() => {
  if (user.value) {
    loadBuilds()
    loadFavorites()
  }
})

watch(user, (u) => {
  if (u) {
    loadBuilds()
    loadFavorites()
  } else {
    savedBuilds.value = []
    favorites.value = []
  }
})
</script>

<template>
  <div class="account-page">
    <!-- ═══════════════════════════════════════════
         UNAUTHENTICATED
         ═══════════════════════════════════════════ -->
    <div v-if="!authLoading && !user" class="account-container liquid-panel">
      <div class="account-content">
        <h1 class="section-title">Sign in to your account</h1>
        <p class="section-desc">
          Sign in to view your subscription, saved builds, and favorite tunes.
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
      <h1 class="page-heading">My Account</h1>

      <!-- Profile -->
      <section class="account-container liquid-panel">
        <div class="account-content">
          <h2 class="section-title">Profile</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Email</span>
              <span class="info-value">{{ user.email }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Display Name</span>
              <span class="info-value info-muted">
                {{ user.user_metadata?.display_name || user.user_metadata?.full_name || 'Not set' }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Subscription -->
      <section class="account-container liquid-panel">
        <div class="account-content">
          <h2 class="section-title">Subscription</h2>

          <div v-if="subLoading" class="section-loading">Loading...</div>

          <template v-else>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Plan</span>
                <span class="info-value" :class="{ 'plan-pro': isPro }">
                  {{ isPro ? (profile?.plan || 'Pro') : 'Free' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Status</span>
                <span class="info-value">
                  <span class="status-dot" :class="{ active: isActive }"></span>
                  {{ isActive ? 'active' : 'inactive' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Expires</span>
                <span class="info-value" :class="{ 'info-muted': !expiresAt }">
                  {{ expiresAt ? formatDate(expiresAt) : 'No expiration' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Billing Provider</span>
                <span class="info-value plan-pro">{{ isPro ? 'Managed by Paddle' : 'Upgrade available' }}</span>
              </div>
            </div>

            <div class="sub-status">
              <p v-if="isPro" class="sub-active-msg">Your Pro membership is active</p>
              <p v-else class="sub-free-msg">Free plan</p>
            </div>

            <button
              v-if="!isPro"
              class="btn-primary" style="width:100%;justify-content:center;"
              @click="router.push('/upgrade')"
            >
              Upgrade Pro
            </button>
          </template>
        </div>
      </section>

      <!-- My Tunes -->
      <section class="account-container liquid-panel">
        <div class="account-content">
          <h2 class="section-title">My Tunes</h2>
          <p class="section-desc">View and manage your published and saved tunes.</p>
          <router-link to="/account/tunes" class="view-all-link">
            View My Tunes
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </router-link>
        </div>
      </section>

      <!-- Saved Builds -->
      <section class="account-container liquid-panel">
        <div class="account-content">
          <h2 class="section-title">Saved Builds</h2>

          <div v-if="buildsLoading" class="section-loading">Loading...</div>

          <template v-else-if="buildsError">
            <p class="section-empty">Unable to load saved builds</p>
          </template>

          <template v-else-if="savedBuilds.length === 0">
            <p class="section-empty">No saved builds yet</p>
          </template>

          <div v-else class="preview-list">
            <div v-for="b in savedBuilds" :key="b.id" class="preview-card readable-layer">
              <span class="preview-title">{{ buildTitle(b) }}</span>
              <span class="preview-date">{{ formatDate(b.created_at) }}</span>
            </div>
            <router-link to="/account/builds" class="view-all-link">
              View All Saved Builds
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </router-link>
          </div>
        </div>
      </section>

      <!-- Favorite Tunes -->
      <section class="account-container liquid-panel">
        <div class="account-content">
          <h2 class="section-title">Favorite Tunes</h2>

          <div v-if="favsLoading" class="section-loading">Loading...</div>

          <template v-else-if="favsError">
            <p class="section-empty">Unable to load favorites</p>
          </template>

          <template v-else-if="favorites.length === 0">
            <p class="section-empty">No favorite tunes yet</p>
          </template>

          <div v-else class="preview-list">
            <div v-for="f in favorites" :key="f.id" class="preview-card readable-layer">
              <span class="preview-title">{{ favLabel(f) }}</span>
              <span class="preview-date">{{ formatDate(f.created_at) }}</span>
            </div>
            <router-link to="/account/favorites" class="view-all-link">
              View All Favorite Tunes
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </router-link>
          </div>
        </div>
      </section>
    </template>

    <!-- Loading -->
    <div v-else class="account-container liquid-panel">
      <div class="account-content">
        <p class="section-loading">Loading...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.account-page {
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
  color: #0f1720;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  text-align: center;
}

.account-container {
  width: 100%;
  max-width: 560px;
  border-radius: 24px;
}

.account-content {
  position: relative;
  z-index: 2;
  padding: 32px 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 680;
  color: #0f1720;
  margin: 0;
  letter-spacing: -0.01em;
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

.section-empty {
  font-size: 0.85rem;
  color: #8b95a1;
  font-weight: 500;
  margin: 0;
}

/* ── Info grid ── */
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.info-label {
  font-size: 0.82rem;
  font-weight: 550;
  color: #6b7d92;
  flex-shrink: 0;
}

.info-value {
  font-size: 0.88rem;
  font-weight: 600;
  color: #1f2937;
  text-align: right;
  word-break: break-all;
}

.info-muted {
  color: #8b95a1;
  font-weight: 500;
}

.plan-pro {
  color: #3d6a4a;
}

/* ── Status dot ── */
.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c4cdd5;
  margin-right: 4px;
  vertical-align: middle;
}

.status-dot.active {
  background: #5b8a6a;
}

/* ── Subscription status ── */
.sub-status {
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(15, 23, 32, 0.03);
  border: 1px solid rgba(15, 23, 32, 0.05);
}

.sub-active-msg {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 580;
  color: #3d6a4a;
}

.sub-free-msg {
  margin: 0;
  font-size: 0.84rem;
  font-weight: 550;
  color: #6b7d92;
}

/* ── Preview cards ── */
.preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.preview-title {
  font-size: 0.85rem;
  font-weight: 580;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-date {
  font-size: 0.75rem;
  font-weight: 500;
  color: #8b95a1;
  flex-shrink: 0;
}

/* ── View All link ── */
.view-all-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  text-decoration: none;
  padding: 6px 0;
  transition: gap 0.2s ease, color 0.2s ease;
}

.view-all-link:hover {
  gap: 10px;
  color: #2d4a63;
}

/* ── Login form (unauthenticated) ── */
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

@media (max-width: 640px) {
  .account-page {
    padding: 16px;
    padding-top: 32px;
    padding-bottom: 60px;
    gap: 16px;
  }

  .page-heading {
    font-size: 1.35rem;
  }

  .account-container {
    border-radius: 20px;
  }

  .account-content {
    padding: 24px 20px;
    gap: 14px;
  }

  .section-title {
    font-size: 0.95rem;
  }

  .info-value {
    font-size: 0.82rem;
  }
}
</style>
