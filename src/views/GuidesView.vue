<script setup>
import { useRouter } from 'vue-router'
import { GUIDES } from '../data/guides.js'
import { useSeoMeta, makeBreadcrumbSchema } from '../composables/useSeoMeta.js'
import { useI18n } from '../i18n/index.js'

const router = useRouter()
const { t } = useI18n()

useSeoMeta({
  title: 'Forza Tuning Guides — Free Tutorials & Setup Advice',
  description: 'Free Forza tuning guides covering AWD, RWD, drift, road racing, understeer and oversteer fixes. Learn how to tune every car with step-by-step instructions.',
  ogType: 'website',
  jsonLd: [
    {
      '@type': 'CollectionPage',
      name: 'Forza Tuning Guides',
      description: 'Free Forza tuning guides covering AWD, RWD, drift, road racing, understeer and oversteer fixes.',
      isPartOf: { '@type': 'WebSite', name: 'Forza Tuning Calculator', url: window.location.origin },
    },
    makeBreadcrumbSchema([
      { name: 'Home', url: window.location.origin },
      { name: 'Guides', url: `${window.location.origin}/guides` },
    ]),
  ],
})

function goToGuide(slug) {
  router.push(`/guides/${slug}`)
}

const categoryIcons = {
  'how-to-tune-awd': 'drivetrain',
  'how-to-tune-rwd': 'drivetrain',
  'how-to-fix-understeer': 'fix',
  'how-to-fix-oversteer': 'fix',
  'road-tuning-guide': 'discipline',
  'drift-tuning-guide': 'discipline',
}
</script>

<template>
  <div class="guides-page">

    <!-- ═══════════ Hero ═══════════ -->
    <section class="guides-hero liquid-panel">
      <h1 class="guides-title">Forza Tuning Guides</h1>
      <p class="guides-subtitle">Free step-by-step tuning tutorials. Learn how to tune every drivetrain, fix handling issues, and build competitive setups for every discipline.</p>
    </section>

    <!-- ═══════════ Guide Cards ═══════════ -->
    <section class="guides-list">
      <article
        v-for="g in GUIDES"
        :key="g.slug"
        class="guide-card glass-card-soft"
        @click="goToGuide(g.slug)"
      >
        <div class="guide-card-body">
          <span class="guide-card-category">{{ categoryIcons[g.slug] === 'drivetrain' ? 'Drivetrain' : categoryIcons[g.slug] === 'fix' ? 'Fix' : 'Discipline' }}</span>
          <h2 class="guide-card-title">{{ g.h1 }}</h2>
          <p class="guide-card-desc">{{ g.seoDescription }}</p>
          <div class="guide-card-meta">
            <span class="guide-card-sections">{{ g.keyPrinciples.length }} principles</span>
            <span class="guide-card-sections">{{ g.commonMistakes.length }} mistakes</span>
            <span class="guide-card-sections">{{ g.recommendedSettings.length }} settings</span>
          </div>
        </div>
        <div class="guide-card-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </article>
    </section>

  </div>
</template>

<style scoped>
.guides-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
}

/* ── Hero ── */
.guides-hero {
  display: flex; flex-direction: column; gap: 14px;
  padding: 44px 40px; border-radius: 24px;
}
.guides-title {
  font-size: clamp(1.6rem, 4vw, 2.4rem); font-weight: 720;
  color: #000000; margin: 0; line-height: 1.15;
  letter-spacing: -0.02em; position: relative; z-index: 2;
}
.guides-subtitle {
  font-size: 0.95rem; line-height: 1.6; color: #111111;
  font-weight: 500; margin: 0; max-width: 600px;
  position: relative; z-index: 2;
}

/* ── Guide Cards ── */
.guides-list { display: flex; flex-direction: column; gap: 14px; }

.guide-card {
  display: flex; align-items: center; gap: 20px;
  padding: 24px 28px; border-radius: 18px;
  cursor: pointer; transition: all 0.2s ease;
  position: relative; z-index: 2;
}
.guide-card:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.07); }

.guide-card-body { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }

.guide-card-category {
  display: inline-flex; align-self: flex-start;
  padding: 3px 10px; border-radius: 6px;
  font-size: 0.60rem; font-weight: 650; letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #4a6b85;
  background: rgba(74, 107, 133, 0.08);
  border: 1px solid rgba(91, 122, 154, 0.16);
}

.guide-card-title {
  font-size: 1.05rem; font-weight: 680; color: #000000;
  margin: 0; line-height: 1.25;
}
.guide-card-desc {
  font-size: 0.82rem; line-height: 1.55; color: #333333;
  font-weight: 480; margin: 0;
}
.guide-card-meta {
  display: flex; gap: 12px; flex-wrap: wrap;
}
.guide-card-sections {
  font-size: 0.68rem; font-weight: 550; color: #6b859e;
}

.guide-card-arrow {
  flex-shrink: 0; color: #bcc5cf;
  display: flex; align-items: center;
  transition: color 0.2s ease, transform 0.2s ease;
}
.guide-card:hover .guide-card-arrow { color: #5b7a9a; transform: translateX(2px); }

/* ═══════════ Mobile ═══════════ */
@media (max-width: 640px) {
  .guides-page { padding: 16px; padding-top: 24px; padding-bottom: 60px; gap: 24px; }
  .guides-hero { padding: 32px 22px; border-radius: 20px; gap: 10px; }
  .guides-title { font-size: clamp(1.3rem, 6vw, 1.8rem); }
  .guides-subtitle { font-size: 0.86rem; }
  .guide-card { padding: 20px; gap: 14px; }
  .guide-card-title { font-size: 0.95rem; }
  .guide-card-desc { font-size: 0.78rem; }
}
</style>
