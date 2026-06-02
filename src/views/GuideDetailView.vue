<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase.js'
import { getGuideBySlug, getAllGuideSlugs } from '../data/guides.js'
import VehicleCard from '../components/VehicleCard.vue'
import { useSeoMeta, makeBreadcrumbSchema } from '../composables/useSeoMeta.js'
import { generateSlug } from '../utils/slug.js'
import { useI18n } from '../i18n/index.js'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const slug = computed(() => route.params.slug)
const guide = computed(() => getGuideBySlug(slug.value))
const notFound = computed(() => !guide.value)

// ── SEO ──
useSeoMeta({
  title: computed(() => guide.value?.seoTitle || 'Tuning Guide'),
  description: computed(() => guide.value?.seoDescription || ''),
  ogType: 'article',
  jsonLd: computed(() => guide.value ? [
    {
      '@type': 'Article',
      headline: guide.value.seoTitle,
      description: guide.value.seoDescription,
      author: { '@type': 'Organization', name: 'Forza Tuning Calculator' },
      publisher: { '@type': 'Organization', name: 'Forza Tuning Calculator' },
    },
    makeBreadcrumbSchema([
      { name: 'Home', url: window.location.origin },
      { name: 'Guides', url: `${window.location.origin}/guides` },
      { name: guide.value.h1, url: `${window.location.origin}/guides/${guide.value.slug}` },
    ]),
  ] : undefined),
})

// ── Related Vehicles ──
const relatedVehicles = ref([])
const vehiclesLoading = ref(false)

async function fetchRelatedVehicles() {
  if (!guide.value?.relatedVehiclesFilter) return
  vehiclesLoading.value = true
  const filter = guide.value.relatedVehiclesFilter

  if (supabase) {
    try {
      let query = supabase.from('vehicles').select('*')
      if (filter.drivetrain) query = query.eq('drivetrain', filter.drivetrain)
      if (filter.drivetrains) query = query.in('drivetrain', filter.drivetrains)
      if (filter.classIn) query = query.in('class', filter.classIn)
      query = query.order(filter.orderField || 'horsepower', { ascending: filter.orderDir !== false }).limit(filter.limit || 4)
      const { data, error } = await query
      if (!error && data) {
        relatedVehicles.value = data
        vehiclesLoading.value = false
        return
      }
    } catch { /* fall through */ }
  }

  // Local JSON fallback
  try {
    const res = await fetch('/data/vehicles.json')
    if (res.ok) {
      const raw = await res.json()
      const list = Array.isArray(raw) ? raw : (raw.vehicles || [])
      let filtered = list
      if (filter.drivetrain) filtered = filtered.filter(v => v.drivetrain === filter.drivetrain)
      if (filter.drivetrains) filtered = filtered.filter(v => filter.drivetrains.includes(v.drivetrain))
      if (filter.classIn) filtered = filtered.filter(v => filter.classIn.includes(v.class))
      filtered.sort((a, b) => (b[filter.orderField || 'horsepower'] || 0) - (a[filter.orderField || 'horsepower'] || 0))
      relatedVehicles.value = filtered.slice(0, filter.limit || 4).map(v => ({
        ...v,
        slug: v.slug || generateSlug(v.manufacturer, v.name, v.year),
      }))
    }
  } catch { /* silent */ }
  vehiclesLoading.value = false
}

onMounted(() => fetchRelatedVehicles())
watch(slug, () => fetchRelatedVehicles())

// ── Related Guides ──
const relatedGuides = computed(() => {
  if (!guide.value?.relatedGuides) return []
  return guide.value.relatedGuides.map(s => getGuideBySlug(s)).filter(Boolean)
})

function goToGuide(gSlug) {
  router.push(`/guides/${gSlug}`)
}
</script>

<template>
  <div class="gd-page">
    <!-- ── 404 ── -->
    <div v-if="notFound" class="gd-state">
      <div class="gd-state-card liquid-panel">
        <span class="gd-state-icon">404</span>
        <h2 class="gd-state-title">Guide Not Found</h2>
        <p class="gd-state-desc">This guide may not exist yet.</p>
        <router-link to="/guides" class="gd-back-btn btn-glass">Browse Guides</router-link>
      </div>
    </div>

    <template v-else-if="guide">
      <!-- Back -->
      <router-link to="/guides" class="gd-back liquid-glass">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Tuning Guides
      </router-link>

      <!-- ═══════════ Article ═══════════ -->
      <article class="gd-article liquid-panel">
        <h1 class="gd-h1">{{ guide.h1 }}</h1>

        <!-- Introduction -->
        <section class="gd-section">
          <p v-for="(p, i) in guide.introduction" :key="'intro-'+i" class="gd-p">{{ p }}</p>
        </section>

        <!-- Key Principles -->
        <section class="gd-section">
          <h2 class="gd-h2">Key Principles</h2>
          <div v-for="(kp, i) in guide.keyPrinciples" :key="'kp-'+i" class="gd-principle">
            <h3 class="gd-h3">{{ i + 1 }}. {{ kp.title }}</h3>
            <p class="gd-p">{{ kp.body }}</p>
          </div>
        </section>

        <!-- Common Mistakes -->
        <section class="gd-section">
          <h2 class="gd-h2">Common Mistakes</h2>
          <div v-for="(cm, i) in guide.commonMistakes" :key="'cm-'+i" class="gd-mistake">
            <h3 class="gd-h3 gd-mistake-title">{{ cm.title }}</h3>
            <p class="gd-p">{{ cm.body }}</p>
          </div>
        </section>

        <!-- Recommended Settings -->
        <section class="gd-section">
          <h2 class="gd-h2">Recommended Settings</h2>
          <div class="gd-settings-table">
            <div class="gd-table-header">
              <span class="gd-th">Parameter</span>
              <span class="gd-th">Recommendation</span>
              <span class="gd-th gd-th-notes">Notes</span>
            </div>
            <div v-for="(rs, i) in guide.recommendedSettings" :key="'rs-'+i" class="gd-table-row">
              <span class="gd-td gd-td-label">{{ rs.parameter }}</span>
              <span class="gd-td gd-td-value">{{ rs.front || rs.setting || '' }}{{ rs.rear ? ' / ' + rs.rear : '' }}</span>
              <span class="gd-td gd-td-notes">{{ rs.notes }}</span>
            </div>
          </div>
        </section>
      </article>

      <!-- ═══════════ Related Vehicles ═══════════ -->
      <section v-if="relatedVehicles.length > 0" class="gd-section">
        <h2 class="gd-h2">Related Vehicles</h2>
        <div v-if="vehiclesLoading" class="gd-state-card liquid-panel" style="padding:24px;">
          <span class="gd-state-text">Loading vehicles...</span>
        </div>
        <div v-else class="gd-vehicles-grid">
          <VehicleCard v-for="v in relatedVehicles" :key="v.id || v.slug" :vehicle="v" />
        </div>
      </section>

      <!-- ═══════════ Related Guides ═══════════ -->
      <section v-if="relatedGuides.length > 0" class="gd-section">
        <h2 class="gd-h2">Related Guides</h2>
        <div class="gd-related-grid">
          <button
            v-for="rg in relatedGuides"
            :key="rg.slug"
            class="gd-related-card glass-card-soft"
            @click="goToGuide(rg.slug)"
          >
            <span class="gd-related-title">{{ rg.h1 }}</span>
            <span class="gd-related-desc">{{ rg.seoDescription }}</span>
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.gd-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  padding-top: 32px;
  padding-bottom: 80px;
  max-width: 820px;
  margin: 0 auto;
  width: 100%;
}

/* ── Back ── */
.gd-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #4a6b85;
  text-decoration: none;
  transition: all 0.2s ease;
  align-self: flex-start;
}
.gd-back:hover { color: #2d4a63; transform: translateX(-2px); }

/* ── State ── */
.gd-state { display: flex; align-items: center; justify-content: center; min-height: 50vh; }
.gd-state-card {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 44px 36px; border-radius: 24px; text-align: center; max-width: 400px;
}
.gd-state-icon { font-size: 2.2rem; font-weight: 700; color: #4a6b85; }
.gd-state-title { font-size: 1.1rem; font-weight: 680; color: #111827; margin: 0; }
.gd-state-desc { font-size: 0.85rem; color: #374151; font-weight: 500; margin: 0; }
.gd-state-text { font-size: 0.85rem; font-weight: 550; color: #4a6b85; }
.gd-back-btn { padding: 10px 22px; font-size: 0.84rem; font-weight: 620; text-decoration: none; }

/* ── Article ── */
.gd-article {
  padding: 44px 40px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.gd-h1 {
  font-size: clamp(1.6rem, 4vw, 2.2rem);
  font-weight: 720; color: #000000; margin: 0;
  line-height: 1.15; letter-spacing: -0.02em;
  position: relative; z-index: 2;
}
.gd-section { display: flex; flex-direction: column; gap: 14px; position: relative; z-index: 2; }
.gd-h2 {
  font-size: 1.15rem; font-weight: 680; color: #000000; margin: 0;
  letter-spacing: -0.01em;
}
.gd-h3 {
  font-size: 0.95rem; font-weight: 650; color: #111827; margin: 0; line-height: 1.3;
}
.gd-p {
  font-size: 0.88rem; line-height: 1.75; color: #222222; font-weight: 500; margin: 0;
}
.gd-principle { display: flex; flex-direction: column; gap: 6px; }
.gd-mistake { display: flex; flex-direction: column; gap: 6px; }
.gd-mistake-title { color: #8c3d3d; }

/* ── Settings Table ── */
.gd-settings-table {
  display: flex; flex-direction: column;
  border-radius: 16px; overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.50);
  background: rgba(255, 255, 255, 0.60);
}
.gd-table-header {
  display: grid; grid-template-columns: 1.2fr 1fr 1.2fr;
  padding: 12px 18px; gap: 8px;
  background: rgba(255, 255, 255, 0.72);
  border-bottom: 1px solid rgba(180, 190, 200, 0.25);
}
.gd-th { font-size: 0.66rem; font-weight: 650; color: #6b859e; text-transform: uppercase; letter-spacing: 0.05em; }
.gd-table-row {
  display: grid; grid-template-columns: 1.2fr 1fr 1.2fr;
  padding: 11px 18px; gap: 8px;
  border-bottom: 1px solid rgba(180, 190, 200, 0.12);
}
.gd-table-row:last-child { border-bottom: none; }
.gd-td { font-size: 0.82rem; line-height: 1.4; }
.gd-td-label { font-weight: 620; color: #000000; }
.gd-td-value { font-weight: 580; color: #2d4a63; font-variant-numeric: tabular-nums; white-space: nowrap; }
.gd-td-notes { font-weight: 480; color: #4b5563; font-size: 0.78rem; }

/* ── Related Vehicles ── */
.gd-vehicles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}

/* ── Related Guides ── */
.gd-related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
}
.gd-related-card {
  display: flex; flex-direction: column; gap: 8px;
  padding: 20px; border-radius: 16px;
  text-align: left; cursor: pointer;
  font-family: inherit; font-size: inherit;
  color: inherit; border: 1px solid rgba(255, 255, 255, 0.60);
  position: relative; z-index: 2;
  transition: all 0.2s ease;
}
.gd-related-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.gd-related-title { font-size: 0.86rem; font-weight: 660; color: #000000; line-height: 1.25; }
.gd-related-desc { font-size: 0.74rem; font-weight: 480; color: #4b5563; line-height: 1.5; }

/* ═══════════ Mobile ═══════════ */
@media (max-width: 640px) {
  .gd-page { padding: 16px; padding-top: 24px; padding-bottom: 60px; gap: 20px; }
  .gd-article { padding: 28px 20px; border-radius: 20px; gap: 24px; }
  .gd-h1 { font-size: clamp(1.3rem, 6vw, 1.6rem); }
  .gd-h2 { font-size: 1.05rem; }
  .gd-p { font-size: 0.84rem; }
  .gd-table-header, .gd-table-row { grid-template-columns: 1fr 0.8fr; padding: 10px 14px; }
  .gd-th-notes, .gd-td-notes { display: none; }
  .gd-vehicles-grid, .gd-related-grid { grid-template-columns: 1fr; }
}
</style>
