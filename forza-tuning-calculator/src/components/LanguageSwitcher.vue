<script setup>
import { useI18n } from '../i18n/index.js'

const { currentLang, setLang } = useI18n()

const label = { en: 'EN', zh: '中文' }

function toggle() {
  setLang(currentLang.value === 'en' ? 'zh' : 'en')
}
</script>

<template>
  <button class="lang-switcher liquid-glass" @click="toggle" :title="currentLang === 'en' ? 'Switch to 中文' : 'Switch to English'">
    {{ label[currentLang] }}
  </button>
</template>

<style scoped>
.lang-switcher {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 650;
  color: #4a6b85;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  white-space: nowrap;
  min-width: 40px;
  text-align: center;
}

.lang-switcher:hover {
  color: #2d4a63;
  transform: translateY(-1px);
}
</style>
