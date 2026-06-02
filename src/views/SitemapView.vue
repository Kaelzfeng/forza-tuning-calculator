<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase.js'

const xml = ref('')
const error = ref(false)

const BASE_URL = import.meta.env.VITE_SITE_URL
  || (typeof window !== 'undefined' ? window.location.origin : '')

function escapeXml(str) {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

async function generate() {
  const today = new Date().toISOString().slice(0, 10)

  // Static pages
  const staticUrls = [
    urlEntry(`${BASE_URL}/`, today, 'weekly', '1.0'),
    urlEntry(`${BASE_URL}/calculator`, today, 'monthly', '0.8'),
    urlEntry(`${BASE_URL}/tunes`, today, 'daily', '0.9'),
    urlEntry(`${BASE_URL}/vehicles`, today, 'daily', '0.9'),
    urlEntry(`${BASE_URL}/best-awd-cars`, today, 'weekly', '0.7'),
    urlEntry(`${BASE_URL}/best-drift-cars`, today, 'weekly', '0.7'),
    urlEntry(`${BASE_URL}/best-beginner-cars`, today, 'weekly', '0.7'),
    urlEntry(`${BASE_URL}/best-s1-cars`, today, 'weekly', '0.7'),
    urlEntry(`${BASE_URL}/guides`, today, 'weekly', '0.8'),
    urlEntry(`${BASE_URL}/guides/how-to-tune-awd`, today, 'monthly', '0.6'),
    urlEntry(`${BASE_URL}/guides/how-to-tune-rwd`, today, 'monthly', '0.6'),
    urlEntry(`${BASE_URL}/guides/how-to-fix-understeer`, today, 'monthly', '0.6'),
    urlEntry(`${BASE_URL}/guides/how-to-fix-oversteer`, today, 'monthly', '0.6'),
    urlEntry(`${BASE_URL}/guides/road-tuning-guide`, today, 'monthly', '0.6'),
    urlEntry(`${BASE_URL}/guides/drift-tuning-guide`, today, 'monthly', '0.6'),
  ]

  let tuneUrls = ''
  let vehicleUrls = ''

  if (supabase) {
    // Tunes
    try {
      const { data: tunes } = await supabase
        .from('tunes_public')
        .select('slug, created_at')
        .order('created_at', { ascending: false })
        .limit(5000)

      if (tunes) {
        tuneUrls = tunes.map(t =>
          urlEntry(
            `${BASE_URL}/tunes/${t.slug}`,
            (t.created_at || today).slice(0, 10),
            'weekly',
            '0.7',
          )
        ).join('\n')
      }
    } catch { /* graceful — no tunes in sitemap */ }

    // Vehicles
    try {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('slug, updated_at')
        .order('manufacturer')

      if (vehicles) {
        vehicleUrls = vehicles.map(v =>
          urlEntry(
            `${BASE_URL}/vehicles/${v.slug}`,
            (v.updated_at || today).slice(0, 10),
            'weekly',
            '0.8',
          )
        ).join('\n')
      }
    } catch { /* graceful — no vehicles in sitemap */ }
  }

  xml.value = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
${tuneUrls}
${vehicleUrls}
</urlset>`
}

onMounted(() => {
  generate().catch(() => { error.value = true })
})
</script>

<template>
  <div v-if="error" style="padding:20px;font-family:monospace;color:#b85b5b;">
    Sitemap generation failed.
  </div>
  <pre v-else-if="xml" v-text="xml" style="white-space:pre-wrap;word-break:break-all;padding:20px;font-family:monospace;font-size:13px;color:#222222;"></pre>
  <div v-else style="padding:20px;font-family:monospace;color:#333333;">Generating sitemap...</div>
</template>
