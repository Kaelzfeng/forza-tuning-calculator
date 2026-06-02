<script setup>
import { useToast } from '../composables/useToast.js'

const { toasts, remove } = useToast()

const iconMap = {
  success: { path: 'M20 6L9 17l-5-5', viewBox: '0 0 24 24' },
  error:   { path: 'M18 6L6 18M6 6l12 12', viewBox: '0 0 24 24' },
  warning: { path: 'M12 9v4M12 17h.01', viewBox: '0 0 24 24' },
  info:    { path: 'M12 16v-4M12 8h.01', viewBox: '0 0 24 24' },
}
</script>

<template>
  <Teleport to="body">
    <div v-if="toasts.length" class="toast-stack">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast-item', `toast-${t.type}`]"
        @click="remove(t.id)"
      >
        <svg width="15" height="15" :viewBox="iconMap[t.type]?.viewBox || '0 0 24 24'" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="toast-icon">
          <path :d="iconMap[t.type]?.path || 'M12 16v-4M12 8h.01'" />
        </svg>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: 14px;
  font-size: 0.84rem;
  font-weight: 600;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  cursor: pointer;
  transition: all 0.2s ease;
  pointer-events: auto;
  animation: toast-in 0.25s ease;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.toast-icon { flex-shrink: 0; }

.toast-success { color: #fff; background: rgba(30, 130, 76, 0.92); }
.toast-error   { color: #fff; background: rgba(180, 60, 60, 0.92); }
.toast-warning { color: #fff; background: rgba(180, 120, 30, 0.92); }
.toast-info    { color: #fff; background: rgba(60, 100, 160, 0.92); }
</style>
