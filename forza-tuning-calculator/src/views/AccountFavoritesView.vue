<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { supabase } from '../lib/supabase.js'
import { useSeoMeta } from '../composables/useSeoMeta.js'

const router = useRouter()
const { user, loading: authLoading, signInWithMagicLink } = useAuth()

useSeoMeta({
  title: 'My Favorite Tunes | Forza Tuning Calculator',
  description: 'View and manage your favorite Forza tunes.',
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

// ── Favorites ──
const favorites = ref([])
const loading = ref(false)
const error = ref(false)

async function loadFavorites() {
  if (!supabase || !user.value) return
  loading.value = true
  error.value = false
  try {
    const { data, err } = await supabase
      .from('favorites')
      .select('*, vehicles(manufacturer, model, year, slug)')
      .eq('user_id', user.value.id)
      .order('created_at', { ascending: false })

    if (err) {
      console.error('Favorites load error:', err.message)
      error.value = true
      return
    }
    favorites.value = data || []
  } catch (e) {
    console.error('Favorites load failed:', e)
    error.value = true
  } finally {
    loading.value = false
  }
}

function favTitle(f) {
  return f.tune_name || f.title || favVehicle(f) || 'Favorite Tune'
}

function favVehicle(f) {
  if (f.vehicles) {
    const v = f.vehicles
    return [v.manufacturer, v.model].filter(Boolean).join(' ') || null
  }
  return null
}

function vehicleDetail(f) {
  if (f.vehicles) {
    const v = f.vehicles
    return [v.year, v.manufacturer, v.model].filter(Boolean).join(' ')
  }
  return null
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function openFavorite(f) {
  if (f.tune_id) {
    router.push(`/tunes/${f.tune_id}`)
    return
  }
  if (f.tune_slug) {
    router.push(`/tunes/${f.tune_slug}`)
    return
  }
  if (f.vehicles?.slug) {
    router.push(`/vehicles/${f.vehicles.slug}`)
    return
  }
  console.log('TODO: open favorite tune')
}

// ── Remove ──
const removeTarget = ref(null)

function confirmRemove(f) {
  removeTarget.value = f
}

function cancelRemove() {
  removeTarget.value = null
}

async function executeRemove() {
  if (!supabase || !removeTarget.value) return
  const fav = removeTarget.value
  try {
    const { err } = await supabase
      .from('favorites')
      .delete()
      .eq('id', fav.id)

    if (err) {
      console.error('Remove error:', err.message)
      return
    }
    favorites.value = favorites.value.filter((f) => f.id !== fav.id)
  } catch (e) {
    console.error('Remove failed:', e)
  } finally {
    removeTarget.value = null
  }
}

// ── Lifecycle ──
onMounted(() => {
  if (user.value) loadFavorites()
})

watch(user, (u) => {
  if (u) loadFavorites()
  else favorites.value = []
})
</script>

<template>
  <div class="favs-page">
    <!-- ═══════════════════════════════════════════
         UNAUTHENTICATED
         ═══════════════════════════════════════════ -->
    <div v-if="!authLoading && !user" class="favs-container liquid-panel">
      <div class="favs-content">
        <h1 class="page-heading">My Favorite Tunes</h1>
        <p class="section-desc">
          Sign in to view your favorite tunes.
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
      <h1 class="page-heading">My Favorite Tunes</h1>

      <!-- Error -->
      <div v-if="error" class="favs-container liquid-panel">
        <div class="favs-content state-center">
          <p class="state-text">Unable to load favorite tunes</p>
          <button class="btn-primary" @click="loadFavorites">Retry</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="favs-container liquid-panel">
        <div class="favs-content state-center">
          <p class="section-loading">Loading...</p>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="favorites.length === 0" class="favs-container liquid-panel">
        <div class="favs-content state-center">
          <p class="state-text">No favorite tunes yet</p>
          <button class="btn-primary" @click="router.push('/tunes')">
            Browse Tunes
          </button>
        </div>
      </div>

      <!-- Favorites list -->
      <div v-else class="favs-list">
        <div v-for="f in favorites" :key="f.id" class="fav-card liquid-panel">
          <div class="fav-card-content">
            <div class="fav-info">
              <span class="fav-name">{{ favTitle(f) }}</span>
              <span v-if="vehicleDetail(f)" class="fav-vehicle">{{ vehicleDetail(f) }}</span>
              <span class="fav-date">{{ formatDate(f.created_at) }}</span>
            </div>

            <div class="fav-actions">
              <button class="btn-secondary" @click="openFavorite(f)">
                Open
              </button>
              <button class="btn-danger" @click="confirmRemove(f)">
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-else class="favs-container liquid-panel">
      <div class="favs-content state-center">
        <p class="section-loading">Loading...</p>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         REMOVE CONFIRMATION OVERLAY
         ═══════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="removeTarget" class="confirm-overlay" @click.self="cancelRemove">
        <div class="confirm-modal liquid-panel">
          <p class="confirm-text">Remove this favorite?</p>
          <div class="confirm-actions">
            <button class="confirm-cancel" @click="cancelRemove">Cancel</button>
            <button class="btn-danger" @click="executeRemove">Remove</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.favs-page {
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

/* ── Container ── */
.favs-container {
  width: 100%;
  max-width: 600px;
  border-radius: 24px;
}

.favs-content {
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

/* ── Favorites list ── */
.favs-list {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fav-card {
  border-radius: 16px;
}

.fav-card-content {
  position: relative;
  z-index: 2;
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.fav-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.fav-name {
  font-size: 0.9rem;
  font-weight: 620;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-vehicle {
  font-size: 0.78rem;
  font-weight: 550;
  color: #4a6b85;
}

.fav-date {
  font-size: 0.72rem;
  font-weight: 500;
  color: #8b95a1;
}

.fav-actions {
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

/* ── Remove confirmation ── */
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
  .favs-page {
    padding: 16px;
    padding-top: 32px;
    padding-bottom: 60px;
    gap: 16px;
  }

  .page-heading {
    font-size: 1.35rem;
  }

  .favs-container {
    border-radius: 20px;
  }

  .favs-content {
    padding: 24px 20px;
    gap: 14px;
  }

  .fav-card-content {
    padding: 14px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .fav-actions {
    width: 100%;
  }
}
</style>
