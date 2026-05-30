<script setup>
import { useRouter } from 'vue-router'
import { useProAccess } from '../composables/useProAccess.js'

const router = useRouter()
const { isPro } = useProAccess()

function handleClick() {
  router.push('/upgrade')
}
</script>

<template>
  <button
    v-if="!isPro"
    class="upgrade-btn liquid-glass"
    title="Upgrade to Pro"
    @click="handleClick"
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="upgrade-icon">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
    Upgrade Pro
  </button>
  <span
    v-else
    class="pro-badge"
    title="Your subscription is active"
  >
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="pro-icon">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    Pro Active
  </span>
</template>

<style scoped>
.upgrade-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 620;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-family: inherit;
  color: #4a6b85;
}

.upgrade-btn:hover:not(:disabled) {
  color: #2d4a63;
  transform: translateY(-1px);
}

.upgrade-btn:disabled {
  opacity: 0.7;
  cursor: default;
}

.pro-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  background: rgba(120, 255, 180, 0.12);
  border: 1px solid rgba(120, 255, 180, 0.25);
  color: #4caf7a;
  white-space: nowrap;
  box-shadow: 0 0 12px rgba(120, 255, 180, 0.08);
}

.pro-icon {
  flex-shrink: 0;
}

.upgrade-icon {
  flex-shrink: 0;
}
</style>
