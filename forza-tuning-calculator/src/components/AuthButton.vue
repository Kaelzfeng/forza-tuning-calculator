<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { useI18n } from '../i18n/index.js'

const router = useRouter()
const { user, loading, error, signInWithMagicLink, signOut } = useAuth()
const { t } = useI18n()

const loginOpen = ref(false)
const email = ref('')
const sending = ref(false)
const sent = ref(false)
const localError = ref('')

function openLogin() {
  email.value = ''
  localError.value = ''
  sent.value = false
  loginOpen.value = true
}

function closeLogin() {
  loginOpen.value = false
}

async function handleSendLink() {
  localError.value = ''
  if (!email.value.trim()) {
    localError.value = t('auth.pleaseEnterEmail')
    return
  }
  sending.value = true
  try {
    await signInWithMagicLink(email.value.trim())
    sent.value = true
  } catch (e) {
    localError.value = e.message || 'Failed to send link.'
  } finally {
    sending.value = false
  }
}

async function handleSignOut() {
  await signOut()
}
</script>

<template>
  <div class="auth-button">
    <!-- Loading -->
    <div v-if="loading" class="auth-loading liquid-glass">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="auth-spinner">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </div>

    <!-- Logged out → login button -->
    <button
      v-else-if="!user"
      class="auth-login-btn liquid-glass"
      @click="openLogin"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      {{ t('auth.login') }}
    </button>

    <!-- Logged in → email + sign out -->
    <div v-else class="auth-user-area" @click="router.push('/account')">
      <span class="auth-email">{{ user.email }}</span>
      <button class="auth-logout-btn liquid-glass" @click.stop="handleSignOut" :title="t('auth.signOut')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>

    <!-- Magic Link modal -->
    <Teleport to="body">
      <div v-if="loginOpen" class="ab-overlay" @click.self="closeLogin">
        <div class="ab-modal liquid-panel" @click.stop>
          <h3 class="ab-title">{{ t('auth.loginTitle') }}</h3>

          <template v-if="!sent">
            <p class="ab-desc">{{ t('auth.enterEmail') }}</p>
            <input
              v-model="email"
              type="email"
              class="ab-input input-glass"
              :placeholder="t('auth.emailPlaceholder')"
              @keydown.enter="handleSendLink"
            />
            <div v-if="localError" class="ab-error">{{ localError }}</div>
            <div class="ab-actions">
              <button class="ab-cancel" @click="closeLogin">{{ t('auth.cancel') }}</button>
              <button class="ab-send btn-glass" :disabled="sending" @click="handleSendLink">
                {{ sending ? t('auth.sending') : t('auth.sendLink') }}
              </button>
            </div>
          </template>

          <template v-else>
            <p class="ab-desc">{{ t('auth.checkInbox') }} <strong>{{ email }}</strong>.</p>
            <p class="ab-desc ab-desc-sub">{{ t('auth.closeTab') }}</p>
            <div class="ab-actions">
              <button class="ab-send btn-glass" @click="closeLogin">{{ t('auth.gotIt') }}</button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.auth-button {
  position: relative;
  z-index: 110;
  flex-shrink: 0;
}

/* ── Loading ── */
.auth-loading {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7b8ea0;
}

.auth-spinner {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Login button ── */
.auth-login-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #4a6b85;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-family: inherit;
}

.auth-login-btn:hover {
  color: #2d4a63;
  transform: translateY(-1px);
}

/* ── Logged in ── */
.auth-user-area {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 12px;
  transition: background 0.2s ease;
}

.auth-user-area:hover {
  background: rgba(255, 255, 255, 0.25);
}

.auth-email {
  font-size: 0.75rem;
  font-weight: 550;
  color: #334155;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auth-logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #8b95a1;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.auth-logout-btn:hover {
  color: #b85b5b;
  transform: scale(1.08);
}

/* ── Modal ── */
.ab-overlay {
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

.ab-modal {
  width: 100%;
  max-width: 380px;
  padding: 24px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ab-title {
  font-size: 1rem;
  font-weight: 680;
  color: #0f1720;
  margin: 0;
}

.ab-desc {
  font-size: 0.82rem;
  line-height: 1.5;
  color: #5a6775;
  font-weight: 500;
  margin: 0;
}

.ab-desc-sub {
  font-size: 0.72rem;
  color: #8b95a1;
}

.ab-input {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  color: #2d3748;
  font-family: inherit;
  width: 100%;
}

.ab-error {
  font-size: 0.78rem;
  color: #b85b5b;
  font-weight: 550;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(184, 91, 91, 0.06);
  border: 1px solid rgba(184, 91, 91, 0.14);
}

.ab-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.ab-cancel {
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

.ab-cancel:hover {
  background: rgba(255, 255, 255, 0.32);
  color: #334155;
}

.ab-send {
  padding: 9px 22px;
  border-radius: 10px;
  font-size: 0.8rem;
}

.ab-send:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
}

@media (max-width: 640px) {
  .ab-modal {
    margin: 20px;
    padding: 20px 16px;
  }

  .auth-email {
    max-width: 120px;
    font-size: 0.7rem;
  }
}
</style>
