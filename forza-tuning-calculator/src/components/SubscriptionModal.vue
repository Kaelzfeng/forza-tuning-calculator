<script setup>
defineProps({
  open: { type: Boolean, default: false },
  reason: { type: String, default: '' },
})

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sm-overlay" @click.self="$emit('close')">
      <div class="sm-dialog liquid-panel" @click.stop>
        <div class="sm-header">
          <div class="sm-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <button class="sm-close" @click="$emit('close')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <h2 class="sm-title">Unlock Pro Tunes</h2>
        <p class="sm-desc">Get full tuning values, copy presets, save favorites, and unlock advanced tune tools.</p>

        <div v-if="reason" class="sm-reason liquid-glass">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{{ reason }}</span>
        </div>

        <div class="sm-plan liquid-glass">
          <div class="sm-plan-header">
            <span class="sm-plan-name">Pro</span>
            <span class="sm-plan-price">$1.99<span class="sm-plan-period">/month</span></span>
          </div>
          <ul class="sm-features">
            <li class="sm-feature">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Full Tune Values
            </li>
            <li class="sm-feature">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Copy Tune
            </li>
            <li class="sm-feature">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Save Builds
            </li>
            <li class="sm-feature">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Favorites
            </li>
            <li class="sm-feature">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              Advanced Tools
            </li>
          </ul>
        </div>

        <button class="sm-upgrade btn-glass" @click="console.log('TODO: connect Paddle checkout')">
          Upgrade to Pro
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sm-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 18, 32, 0.30);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  padding: 20px;
}

.sm-dialog {
  width: 100%;
  max-width: 420px;
  padding: 24px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
}

.sm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.sm-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(74, 107, 133, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5b7a9a;
}

.sm-close {
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

.sm-close:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #111111;
}

.sm-title {
  font-size: 1.05rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
  position: relative;
  z-index: 2;
}

.sm-desc {
  font-size: 0.85rem;
  line-height: 1.6;
  color: #222222;
  font-weight: 500;
  margin: 0;
  position: relative;
  z-index: 2;
}

.sm-reason {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.78rem;
  font-weight: 550;
  color: #4a6b85;
  position: relative;
  z-index: 2;
}

.sm-plan {
  padding: 18px 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.sm-plan-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.sm-plan-name {
  font-size: 0.95rem;
  font-weight: 680;
  color: #111111;
}

.sm-plan-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: #111111;
}

.sm-plan-period {
  font-size: 0.72rem;
  font-weight: 520;
  color: #333333;
}

.sm-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-feature {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 520;
  color: #222222;
}

.sm-feature svg {
  color: #5b8a6a;
  flex-shrink: 0;
}

.sm-upgrade {
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 620;
  align-self: center;
  margin-top: 4px;
  position: relative;
  z-index: 2;
}

@media (max-width: 480px) {
  .sm-dialog {
    padding: 20px 18px;
    border-radius: 20px;
    gap: 14px;
  }
}
</style>
