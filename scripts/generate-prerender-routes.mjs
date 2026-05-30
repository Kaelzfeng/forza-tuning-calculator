import 'dotenv/config'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

console.log('Generating prerender routes...')

// ── Slug helpers (mirrors import-forza-vehicles.mjs) ──
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-+/g, '-')
}

function generateSlug(manufacturer, name, year) {
  const parts = []
  if (manufacturer) parts.push(slugify(manufacturer))
  if (name) parts.push(slugify(name))
  if (year) parts.push(String(year))
  return parts.join('-') || 'unknown'
}

// ── Step 1: try local data/vehicles.json ──
function loadFromLocal() {
  const jsonPath = resolve('data', 'vehicles.json')

  if (!existsSync(jsonPath)) {
    console.log('data/vehicles.json not found, falling back to Supabase')
    return null
  }

  console.log(`Loading from ${jsonPath}`)

  let raw
  try {
    raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  } catch (e) {
    console.error(`Failed to parse data/vehicles.json: ${e.message}`)
    return null
  }

  // Support both top-level array and { vehicles: [...] }
  const vehicles = Array.isArray(raw) ? raw : (raw.vehicles || [])

  if (vehicles.length === 0) {
    console.log('data/vehicles.json has no vehicles, falling back to Supabase')
    return null
  }

  const slugs = new Set()
  for (const v of vehicles) {
    let slug = v.slug
    if (!slug && v.manufacturer && v.name) {
      slug = generateSlug(v.manufacturer, v.name, v.year)
    }
    if (slug) slugs.add(slug)
  }

  console.log(`Found ${slugs.size} slugs in local data`)
  return [...slugs].sort()
}

// ── Step 2: fallback to Supabase REST API ──
async function loadFromSupabase() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

  if (!SUPABASE_URL) {
    throw new Error('Missing VITE_SUPABASE_URL in .env')
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY in .env')
  }

  console.log(`Supabase URL: ${SUPABASE_URL}`)

  const TIMEOUT_MS = 15_000
  const url = `${SUPABASE_URL}/rest/v1/vehicles?select=slug&order=slug.asc`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res
  try {
    res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') {
      throw new Error(`Request timed out after ${TIMEOUT_MS / 1000}s: ${url}`)
    }
    const cause = e.cause ? ` (${e.cause})` : ''
    throw new Error(`Fetch failed: ${e.message || e}${cause}`)
  }
  clearTimeout(timer)

  if (res.status !== 200) {
    const text = await res.text().catch(() => '(could not read body)')
    throw new Error(`HTTP ${res.status} from ${url}\n${text}`)
  }

  const rows = await res.json()

  console.log(`Fetched ${rows.length} vehicle slugs`)

  return rows.map((r) => r.slug).filter(Boolean).sort()
}

// ── Main ──
async function main() {
  let slugs = loadFromLocal()
  let source = 'local'

  if (!slugs) {
    slugs = await loadFromSupabase()
    source = 'Supabase'
  }

  const routes = ['/', '/vehicles']
  for (const slug of slugs) {
    routes.push(`/vehicles/${slug}`)
  }

  const outputPath = resolve('prerender-routes.json')
  writeFileSync(outputPath, JSON.stringify(routes, null, 2), 'utf-8')

  console.log(`Wrote ${routes.length} routes to prerender-routes.json (source: ${source})`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
