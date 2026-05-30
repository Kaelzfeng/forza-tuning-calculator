<script setup>
import { useI18n } from '../i18n/index.js'

defineProps({
  tune: { type: Object, required: true },
})

const { t, currentLang } = useI18n()

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  const lang = currentLang.value

  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return lang === 'zh' ? `${mins} 分钟前` : `${mins}m ago`
  }
  if (diff < 86400000) {
    const hrs = Math.floor(diff / 3600000)
    return lang === 'zh' ? `${hrs} 小时前` : `${hrs}h ago`
  }
  return d.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <router-link :to="`/tunes/${tune.slug || tune.id}`" class="tune-card liquid-card">
    <div class="tc-top">
      <span v-if="tune.share_code" class="tc-share-code">{{ tune.share_code }}</span>
      <span class="tc-date">{{ formatDate(tune.created_at) }}</span>
    </div>

    <h3 class="tc-title">{{ tune.title || t('tunes.untitled') }}</h3>

    <div class="tc-meta">
      <span v-if="tune.game_mode" class="tc-tag">{{ tune.game_mode }}</span>
      <span v-if="tune.drivetrain" class="tc-tag">{{ tune.drivetrain }}</span>
      <span v-if="tune.class" class="tc-tag">{{ tune.class }}</span>
    </div>

    <p v-if="tune.notes" class="tc-notes">{{ tune.notes }}</p>
  </router-link>
</template>

<style scoped>
.tune-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px 22px;
  border-radius: 18px;
  transition: all 0.2s ease;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

/* Hover handled by global .glass-card / .liquid-card */

.tc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tc-share-code {
  font-size: 0.7rem;
  font-weight: 600;
  color: #4a6b85;
  letter-spacing: 0.05em;
  font-variant-numeric: tabular-nums;
}

.tc-date {
  font-size: 0.62rem;
  font-weight: 500;
  color: #333333;
  flex-shrink: 0;
}

.tc-title {
  font-size: 0.92rem;
  font-weight: 680;
  color: #111111;
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.tc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tc-tag {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.62rem;
  font-weight: 600;
  color: #222222;
  background: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.42);
}

.tc-notes {
  font-size: 0.75rem;
  line-height: 1.55;
  color: #333333;
  font-weight: 500;
  margin: 0;
}
</style>
