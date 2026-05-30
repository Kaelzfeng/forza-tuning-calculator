<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSeoMeta } from '../composables/useSeoMeta.js'
import { useAuth } from '../composables/useAuth.js'
import { useProAccess } from '../composables/useProAccess.js'
import { openPaddleCheckout } from '../lib/paddle.js'

const router = useRouter()
const { user } = useAuth()
const { isPro } = useProAccess()

useSeoMeta({
  title: 'FH6 Pro Membership | Forza Tuning Calculator',
  description: 'Unlock full tuning values, copy presets, save builds, favorites, and advanced calculator tools with FH6 Pro Membership.',
  ogType: 'website',
})

const features = [
  'Full Tune Values',
  'Copy Tune Presets',
  'Save Builds',
  'Favorite Tunes',
  'Advanced Calculator Tools',
]

const message = ref('')

async function handleUpgrade() {
  message.value = ''

  if (isPro.value) return

  if (!user.value) {
    message.value = 'Please sign in before upgrading.'
    return
  }

  const priceId = import.meta.env.VITE_PADDLE_PRO_PRICE_ID
  const clientToken = import.meta.env.VITE_PADDLE_CLIENT_TOKEN

  if (!priceId || !clientToken) {
    message.value = 'Checkout is not configured yet.'
    return
  }

  try {
    await openPaddleCheckout({ priceId, user: user.value })
  } catch (e) {
    console.error('Checkout error:', e)
    message.value = e.message || 'Checkout failed. Please try again.'
  }
}
</script>

<template>
  <div class="upgrade-page">
    <div class="upgrade-container liquid-panel">
      <div class="upgrade-content">
        <div class="upgrade-header">
          <h1 class="upgrade-title">FH6 Pro Membership</h1>
          <p class="upgrade-subtitle">
            Unlock full tuning values, copy presets, save builds, favorites, and advanced calculator tools.
          </p>
        </div>

        <div class="pricing-card">
          <div class="plan-badge">Pro</div>
          <div class="price">
            <span class="price-currency">$</span>
            <span class="price-amount">1.99</span>
            <span class="price-period">/month</span>
          </div>

          <ul class="feature-list">
            <li v-for="f in features" :key="f" class="feature-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="feature-check">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {{ f }}
            </li>
          </ul>

          <button
            v-if="!isPro"
            class="upgrade-btn btn-glass"
            @click="handleUpgrade"
          >
            Upgrade Now
          </button>

          <p v-if="message" class="checkout-error">{{ message }}</p>

          <div v-if="isPro" class="pro-active-section">
            <p class="pro-active-text">Your Pro membership is active</p>
            <button class="upgrade-btn btn-glass" disabled>
              Pro Active
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upgrade-page {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px;
  padding-top: 80px;
  padding-bottom: 80px;
  min-height: 100svh;
}

.upgrade-container {
  width: 100%;
  max-width: 460px;
  border-radius: 28px;
}

.upgrade-content {
  position: relative;
  z-index: 2;
  padding: 44px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.upgrade-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: center;
}

.upgrade-title {
  font-size: 1.55rem;
  font-weight: 720;
  color: #0f1720;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.2;
}

.upgrade-subtitle {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #334155;
  font-weight: 500;
  margin: 0;
}

.pricing-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
  background: rgba(15, 23, 32, 0.04);
  border: 1px solid rgba(15, 23, 32, 0.06);
  border-radius: 20px;
  padding: 32px 28px;
}

.plan-badge {
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #4a6b85;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(74, 107, 133, 0.12);
  padding: 4px 14px;
  border-radius: 12px;
}

.price {
  display: flex;
  align-items: baseline;
  gap: 2px;
  color: #0f1720;
}

.price-currency {
  font-size: 1.1rem;
  font-weight: 650;
  align-self: flex-start;
  margin-top: 4px;
}

.price-amount {
  font-size: 2.8rem;
  font-weight: 780;
  letter-spacing: -0.03em;
  line-height: 1;
}

.price-period {
  font-size: 0.85rem;
  font-weight: 550;
  color: #4a6b85;
  margin-left: 2px;
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 0;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  font-weight: 570;
  color: #1f2937;
}

.feature-check {
  flex-shrink: 0;
  color: #4a6b85;
}

.upgrade-btn {
  width: 100%;
  justify-content: center;
  padding: 14px 24px;
  border-radius: 14px;
  font-size: 0.92rem;
}

.upgrade-btn:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
  filter: none;
}

.checkout-error {
  font-size: 0.82rem;
  font-weight: 550;
  color: #b8742a;
  text-align: center;
  margin: 0;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(194, 120, 74, 0.06);
  border: 1px solid rgba(194, 120, 74, 0.14);
}

.pro-active-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
}

.pro-active-text {
  font-size: 0.85rem;
  font-weight: 580;
  color: #3d6a4a;
  margin: 0;
}

@media (max-width: 640px) {
  .upgrade-page {
    padding: 16px;
    padding-top: 60px;
    padding-bottom: 60px;
  }

  .upgrade-container {
    border-radius: 22px;
  }

  .upgrade-content {
    padding: 32px 22px;
    gap: 26px;
  }

  .upgrade-title {
    font-size: 1.35rem;
  }

  .pricing-card {
    padding: 26px 20px;
    gap: 18px;
  }

  .price-amount {
    font-size: 2.4rem;
  }
}
</style>
