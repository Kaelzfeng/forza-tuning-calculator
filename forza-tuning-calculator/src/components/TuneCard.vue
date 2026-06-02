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

const modeColors = {
  Road:   { bg: 'rgba(91,140,184,0.10)', border: 'rgba(91,140,184,0.22)', color: '#3d648c' },
  Dirt:   { bg: 'rgba(184,154,91,0.10)', border: 'rgba(184,154,91,0.22)', color: '#8c7434' },
  Drift:  { bg: 'rgba(139,91,184,0.10)', border: 'rgba(139,91,184,0.22)', color: '#6a3d8c' },
  Drag:   { bg: 'rgba(184,91,91,0.10)', border: 'rgba(184,91,91,0.22)', color: '#8c3d3d' },
  Circuit:{ bg: 'rgba(91,140,184,0.10)', border: 'rgba(91,140,184,0.22)', color: '#3d648c' },
  Rally:  { bg: 'rgba(184,154,91,0.10)', border: 'rgba(184,154,91,0.22)', color: '#8c7434' },
}

function modeStyle(mode) {
  return modeColors[mode] || { bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.20)', color: '#4a5568' }
}
</script>

<template>
  <router-link :to="`/tunes/${tune.slug || tune.id}`" class="tune-card liquid-card">
    <!-- Share Code — prominent at top -->
    <div class="tc-code-row">
      <span v-if="tune.share_code" class="tc-share-code">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {{ tune.share_code }}
      </span>
      <span v-else class="tc-no-code">{{ t('tunes.untitled') }}</span>
      <span class="tc-date">{{ formatDate(tune.created_at) }}</span>
    </div>

    <h3 class="tc-title">{{ tune.title || t('tunes.untitled') }}</h3>

    <!-- Game Mode + Secondary Tags -->
    <div class="tc-meta">
      <span
        v-if="tune.game_mode"
        class="tc-game-mode"
        :style="{
          background: modeStyle(tune.game_mode).bg,
          borderColor: modeStyle(tune.game_mode).border,
          color: modeStyle(tune.game_mode).color,
        }"
      >{{ tune.game_mode }}</span>
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
  gap: 12px;
  padding: 20px 22px;
  border-radius: 18px;
  transition: all 0.2s ease;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
}

/* ── Share Code Row ── */
.tc-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tc-share-code {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 0.80rem;
  font-weight: 680;
  letter-spacing: 0.07em;
  font-variant-numeric: tabular-nums;
  color: #2d4a63;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(91, 122, 154, 0.28);
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.tc-no-code {
  font-size: 0.68rem;
  font-weight: 550;
  color: #9ca3af;
  font-style: italic;
}

.tc-date {
  font-size: 0.64rem;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
}

/* ── Title ── */
.tc-title {
  font-size: 1rem;
  font-weight: 700;
  color: #000000;
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

/* ── Meta Tags ── */
.tc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tc-game-mode {
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 0.66rem;
  font-weight: 680;
  border: 1px solid;
  letter-spacing: 0.02em;
}

.tc-tag {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.62rem;
  font-weight: 600;
  color: #111111;
  background: rgba(255, 255, 255, 0.60);
  backdrop-filter: blur(8px) saturate(150%);
  -webkit-backdrop-filter: blur(8px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.52);
}

/* ── Notes ── */
.tc-notes {
  font-size: 0.78rem;
  line-height: 1.55;
  color: #222222;
  font-weight: 500;
  margin: 0;
}
</style>
