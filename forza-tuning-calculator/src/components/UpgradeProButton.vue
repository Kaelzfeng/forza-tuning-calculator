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
  <!-- Pro subscription not yet launched; button hidden for Beta -->
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
