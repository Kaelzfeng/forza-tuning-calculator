#!/usr/bin/env node

/**
 * Official Forza Vehicle Importer v1
 *
 * Source: https://forza.net/fh6cars
 * Respects: single manual fetch, no scraping, no background crawler.
 *
 * Usage:
 *   node scripts/import-forza-vehicles.mjs --dry-run
 *   node scripts/import-forza-vehicles.mjs --limit 20
 *   node scripts/import-forza-vehicles.mjs --apply
 *
 * Environment:
 *   VITE_SUPABASE_URL       — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service_role key (server-only, never in frontend)
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ── CLI flags ──
const DRY_RUN = process.argv.includes('--dry-run')
const APPLY = process.argv.includes('--apply')
const FILE_IDX = process.argv.indexOf('--file')
const FILE_PATH = FILE_IDX !== -1 ? process.argv[FILE_IDX + 1] : null
const JSON_IDX = process.argv.indexOf('--json')
const JSON_PATH = JSON_IDX !== -1 ? process.argv[JSON_IDX + 1] : null
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit')
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) || 0 : 0
})()

if (!DRY_RUN && !APPLY && !FILE_PATH && !JSON_PATH) {
  console.log('Usage:')
  console.log('  node scripts/import-forza-vehicles.mjs --dry-run                          # preview parsed vehicles')
  console.log('  node scripts/import-forza-vehicles.mjs --limit 20                         # preview first 20')
  console.log('  node scripts/import-forza-vehicles.mjs --apply                            # upsert into Supabase')
  console.log('  node scripts/import-forza-vehicles.mjs --json cars.json --apply           # import from extracted JSON')
  console.log('  node scripts/import-forza-vehicles.mjs --file page.html --apply           # import from saved HTML')
  process.exit(0)
}

// ── Env ──
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ── Slug generation ──
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

// ── Field normalization ──
function normalizeDrivetrain(raw) {
  if (!raw) return null
  const r = raw.toUpperCase().trim()
  if (r.includes('AWD') || r.includes('ALL')) return 'AWD'
  if (r.includes('RWD') || r.includes('REAR')) return 'RWD'
  if (r.includes('FWD') || r.includes('FRONT')) return 'FWD'
  return null
}

function normalizeClass(raw) {
  if (!raw) return null
  const m = raw.toUpperCase().trim().match(/\b([DCSX]\d?|[AB])\b/)
  if (m) return m[1] === 'X' && m[1].length === 1 ? 'X' : m[1]
  // Map common class labels
  const map = { 'D CLASS': 'D', 'C CLASS': 'C', 'B CLASS': 'B', 'A CLASS': 'A',
                'S1 CLASS': 'S1', 'S2 CLASS': 'S2', 'X CLASS': 'X' }
  return map[raw.toUpperCase().trim()] || null
}

function generateDescription(manufacturer, name, year, drivetrain, horsepower) {
  const parts = [`The ${manufacturer} ${name}`]
  if (year) parts.push(`(${year})`)
  parts.push('is a')
  if (drivetrain) parts.push(drivetrain)
  parts.push('car')
  if (horsepower) parts.push(`with ${horsepower} HP`)
  parts.push('available in Forza Horizon 6. Find the best community tunes and builds for this vehicle.')
  return parts.join(' ')
}

// ── HTML table parser ──
function parseHtmlTable(html) {
  const vehicles = []

  // Strategy 1: Look for table rows with car data
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let trMatch
  while ((trMatch = trRegex.exec(html)) !== null) {
    const row = trMatch[1]
    const cells = []
    let tdMatch
    tdRegex.lastIndex = 0
    while ((tdMatch = tdRegex.exec(row)) !== null) {
      cells.push(tdMatch[1].replace(/<[^>]+>/g, '').trim())
    }
    if (cells.length >= 2) {
      vehicles.push(cells)
    }
  }

  return vehicles
}

// Strategy 2: Look for JSON data embedded in script tags
function parseEmbeddedJson(html) {
  // Look for __NEXT_DATA__, __NUXT__, window.__DATA__, or similar
  const patterns = [
    /<script[^>]*id="__NEXT_DATA__"[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i,
    /<script[^>]*>window\.__INITIAL_STATE__\s*=\s*([\s\S]*?)<\/script>/i,
    /<script[^>]*>window\.__DATA__\s*=\s*({[\s\S]*?})<\/script>/i,
    /<script[^>]*type="application\/json"[^>]*id="vehicle-data"[^>]*>([\s\S]*?)<\/script>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        // continue to next pattern
      }
    }
  }
  return null
}

// Strategy 3: Look for car cards / grid items
function parseCarCards(html) {
  const vehicles = []

  // Common card patterns — look for structured data attributes or heading + list patterns
  const cardPatterns = [
    // data attributes
    /data-manufacturer="([^"]*)"[^>]*data-model="([^"]*)"[^>]*data-year="([^"]*)"/gi,
    // or list items with classes
    /<li[^>]*class="[^"]*car[^"]*"[^>]*>([\s\S]*?)<\/li>/gi,
  ]

  return vehicles
}

// Strategy 4: Parse visible grid/text content
function parseGridContent(html) {
  // Remove scripts, styles, and invisible elements
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')

  // Look for vehicles in structured text
  const vehicles = []

  // Pattern: "Year Manufacturer Model" followed by stats
  const carPattern = /(\d{4})\s+([A-Z][A-Za-z\s]+?)\s+([A-Z][A-Za-z0-9\s\-\/]+?)(?:\s+(AWD|RWD|FWD))?(?:\s+([DCSX]\d?)\s*Class)?/gi

  let match
  while ((match = carPattern.exec(clean)) !== null) {
    vehicles.push({
      year: parseInt(match[1], 10),
      manufacturer: match[2].trim(),
      name: match[3].trim(),
      drivetrain: match[4] || null,
      class_tier: match[5] || null,
    })
  }

  return vehicles
}

// ── Main import logic ──
async function importVehicles() {
  console.log('Forza Vehicle Importer v1')
  console.log('Source: https://forza.net/fh6cars\n')

  let vehicles = []
  let html

  // ── JSON mode (load directly, skip HTML fetch entirely) ──
  if (JSON_PATH) {
    const jsonPath = resolve(JSON_PATH)
    if (!existsSync(jsonPath)) {
      console.error(`File not found: ${jsonPath}`)
      process.exit(1)
    }
    console.log(`Loading from ${jsonPath} ...`)
    const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
    const arr = Array.isArray(raw) ? raw : (raw.cars || raw.vehicles || raw.data || [])
    vehicles = arr.map(v => ({
      year: v.year || v.modelYear || null,
      manufacturer: v.manufacturer || v.make || v.brand || '',
      name: v.model || v.name || v.title || '',
      drivetrain: normalizeDrivetrain(v.drivetrain || v.drive),
      class_tier: normalizeClass(v.class || v.class_tier || v.category),
      horsepower: v.horsepower || v.hp || v.power || null,
      weight_kg: v.weight || v.weight_kg || null,
      engine: v.engine || null,
      image_url: v.image || v.imageUrl || v.image_url || v.thumbnail || null,
    })).filter(v => v.manufacturer && v.name)
    console.log(`Loaded ${vehicles.length} vehicles from JSON\n`)
  } else {
    // Fetch or load the page
    if (FILE_PATH) {
      const filePath = resolve(FILE_PATH)
      if (!existsSync(filePath)) {
        console.error(`File not found: ${filePath}`)
        process.exit(1)
      }
      console.log(`Loading from ${filePath} ...`)
      html = readFileSync(filePath, 'utf-8')
      console.log(`Loaded ${(html.length / 1024).toFixed(0)} KB\n`)
    } else {
      console.log('Fetching https://forza.net/fh6cars ...')
      try {
        const res = await fetch('https://forza.net/fh6cars', {
          headers: {
            'User-Agent': 'ForzaTuneCalculator/1.0 (vehicle data import; single manual fetch)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        html = await res.text()
        console.log(`Fetched ${(html.length / 1024).toFixed(0)} KB\n`)
      } catch (e) {
        console.error(`Fetch failed: ${e.message}`)
        console.error('\nManual fallback:')
        console.error('1. Open https://forza.net/fh6cars in your browser')
        console.error('2. View Source (Ctrl+U) and save as forza-cars.html')
        console.error('3. Run: node scripts/import-forza-vehicles.mjs --file forza-cars.html --apply')
        process.exit(1)
      }
    }

    // Try parsing strategies in order

    // 1. Embedded JSON
    console.log('Trying: embedded JSON data ...')
    const json = parseEmbeddedJson(html)
    if (json) {
      // Navigate common next.js/nuxt data structures
      const vehicleData = json?.props?.pageProps?.vehicles
        || json?.props?.pageProps?.cars
        || json?.vehicles
        || json?.cars
        || json?.data?.vehicles
        || json?.data?.cars

      if (vehicleData && Array.isArray(vehicleData)) {
        vehicles = vehicleData.map(v => ({
          year: v.year || v.modelYear || v.production_year || null,
          manufacturer: v.manufacturer || v.make || v.brand || '',
          name: v.model || v.name || v.title || '',
          drivetrain: normalizeDrivetrain(v.drivetrain || v.drive || v.driveTrain),
          class_tier: normalizeClass(v.class || v.piClass || v.class_tier || v.category),
          horsepower: v.horsepower || v.hp || v.power || null,
          weight_kg: v.weight || v.weight_kg || v.curbWeight || null,
          engine: v.engine || v.engineName || null,
          image_url: v.image || v.imageUrl || v.image_url || null,
        }))
      }
    }

    // 2. HTML table
    if (vehicles.length === 0) {
      console.log('Trying: HTML table rows ...')
      const rows = parseHtmlTable(html)
      if (rows.length > 0) {
        // Assume first row might be header — detect by checking if cells look like labels
        const headerRow = rows[0]
        const isHeader = headerRow.some(cell =>
          /year|manufacturer|model|make|car|vehicle|class|drivetrain/i.test(cell)
        )

        const dataRows = isHeader ? rows.slice(1) : rows
        const headerCells = isHeader ? headerRow.map(c => c.toLowerCase()) : []

        vehicles = dataRows.map(row => {
          const map = {}
          if (isHeader && headerCells.length > 0) {
            row.forEach((cell, i) => { map[headerCells[i] || `col${i}`] = cell })
          } else {
            // Heuristic: common column order
            const [year, manufacturer, model, drivetrain, classTier, hp, weight] = row
            Object.assign(map, { year, manufacturer, model, drivetrain, class: classTier, horsepower: hp, weight })
          }

          return {
            year: parseInt(map.year || map.model_year, 10) || null,
            manufacturer: map.manufacturer || map.make || map.brand || '',
            name: map.model || map.name || map.car || '',
            drivetrain: normalizeDrivetrain(map.drivetrain || map.drive),
            class_tier: normalizeClass(map.class || map.class_tier || map.category),
            horsepower: parseInt(map.horsepower || map.hp || map.power, 10) || null,
            weight_kg: parseInt(map.weight || map.weight_kg || map.curb_weight, 10) || null,
            engine: map.engine || null,
          }
        }).filter(v => v.manufacturer && v.name)
      }
    }

    // 3. Grid content pattern matching
    if (vehicles.length === 0) {
      console.log('Trying: text content pattern matching ...')
      const parsed = parseGridContent(html)
      if (parsed.length > 0) vehicles = parsed
    }
  }

  // ── Deduplicate + normalize ──
  console.log(`Parsed ${vehicles.length} vehicles`)

  // Filter out rows that are clearly not vehicles
  vehicles = vehicles.filter(v => {
    const name = (v.manufacturer + ' ' + v.name).toLowerCase()
    const invalid = ['cookie', 'privacy', 'settings', 'subscribe', 'newsletter', 'sign up', 'log in',
                     'search', 'menu', 'footer', 'header', 'navigation']
    return !invalid.some(w => name.includes(w)) && v.manufacturer.length > 1 && v.name.length > 1
  })

  // Generate slugs and deduplicate
  const seen = new Set()
  const deduped = []
  for (const v of vehicles) {
    const slug = generateSlug(v.manufacturer, v.name, v.year)
    if (seen.has(slug)) continue
    seen.add(slug)

    deduped.push({
      slug,
      name: v.name.trim(),
      manufacturer: v.manufacturer.trim(),
      year: v.year || null,
      drivetrain: v.drivetrain || null,
      class: v.class_tier || null,
      horsepower: v.horsepower || null,
      weight: v.weight_kg || null,
      engine: v.engine || null,
      image_url: v.image_url || null,
      description: v.description || generateDescription(
        v.manufacturer, v.name, v.year, v.drivetrain, v.horsepower
      ),
    })
  }

  console.log(`After dedup: ${deduped.length} vehicles`)

  // ── Apply limit ──
  const toImport = LIMIT > 0 ? deduped.slice(0, LIMIT) : deduped

  // ── Print preview ──
  console.log(`\n--- Preview (first ${Math.min(10, toImport.length)}) ---`)
  for (const v of toImport.slice(0, 10)) {
    console.log(`  ${v.slug}`)
    console.log(`    ${v.manufacturer} ${v.name} | ${v.year || '?'} | ${v.drivetrain || '?'} | ${v.class || '?'} | ${v.horsepower || '?'} HP`)
  }

  if (DRY_RUN || (!APPLY && LIMIT === 0)) {
    console.log(`\n[Dry run] Would import ${toImport.length} vehicles. Use --apply to upsert.`)
    return
  }

  // ── Upsert into Supabase ──
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('\nMissing environment variables.')
    if (!SUPABASE_URL) console.error('  Missing SUPABASE_URL or VITE_SUPABASE_URL in .env')
    if (!SERVICE_KEY) console.error('  Missing SUPABASE_SERVICE_ROLE_KEY in .env')
    console.error('\nAdd to .env:')
    console.error('  SUPABASE_URL=https://xxx.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Allowed columns — anything not in this set is stripped before upsert
  const ALLOWED_COLUMNS = new Set([
    'slug', 'name', 'manufacturer', 'year', 'drivetrain', 'country',
    'class', 'horsepower', 'weight', 'engine', 'image_url', 'description',
  ])

  function filterSchema(row) {
    const clean = {}
    for (const [key, value] of Object.entries(row)) {
      if (ALLOWED_COLUMNS.has(key) && value !== undefined) {
        clean[key] = value
      }
    }
    return clean
  }

  const BATCH_SIZE = 50
  const BATCH_TIMEOUT_MS = 15000
  const startTime = Date.now()

  // Chunk into batches
  const batches = []
  for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
    batches.push(toImport.slice(i, i + BATCH_SIZE))
  }

  console.log(`\nUpserting to Supabase (${batches.length} batches, up to ${BATCH_SIZE}/batch) ...`)

  let imported = 0
  let failed = 0
  const errors = []
  let firstFailedPayload = null

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx]
    const batchNum = batchIdx + 1
    const totalBatches = batches.length
    const batchStart = Date.now()
    const batchData = batch.map(v => filterSchema({ ...v }))

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .upsert(batchData, { onConflict: 'slug' })
        .select('id, slug')

      const batchMs = Date.now() - batchStart

      if (error) {
        failed += batch.length
        errors.push({
          batch: batchNum,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        if (!firstFailedPayload) firstFailedPayload = { batch: batchNum, firstRow: batchData[0] }
        console.log(`  Batch ${batchNum}/${totalBatches} — FAILED (${batchMs}ms)`)
        console.log(`    code: ${error.code}  message: ${error.message}`)
        if (error.details) console.log(`    details: ${error.details}`)
        if (error.hint) console.log(`    hint: ${error.hint}`)
      } else {
        const rowCount = data?.length ?? batch.length
        imported += batch.length
        const warn = batchMs > BATCH_TIMEOUT_MS ? ` ⚠ SLOW (${batchMs}ms)` : ` (${batchMs}ms)`
        console.log(`  Batch ${batchNum}/${totalBatches} — rows: ${rowCount}${warn}`)
      }
    } catch (e) {
      failed += batch.length
      errors.push({ batch: batchNum, message: e.message })
      if (!firstFailedPayload) firstFailedPayload = { batch: batchNum, slug: batch[0]?.slug }
      console.log(`  Batch ${batchNum}/${totalBatches} — EXCEPTION: ${e.message}`)
    }
  }

  // ── Summary ──
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n--- Import Summary ---`)
  console.log(`  Total fetched:   ${deduped.length}`)
  console.log(`  Imported:        ${imported}`)
  console.log(`  Failed:          ${failed}`)
  console.log(`  Duration:        ${durationSec}s`)

  if (errors.length > 0) {
    console.log(`\n--- Errors (${errors.length}) ---`)
    for (const e of errors.slice(0, 20)) {
      console.log(`  Batch ${e.batch}: ${e.message}`)
      if (e.code) console.log(`    code=${e.code} details=${e.details} hint=${e.hint}`)
    }
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more`)
    }
    if (firstFailedPayload) {
      console.log(`\n--- First Failed Payload ---`)
      console.log(JSON.stringify(firstFailedPayload, null, 2))
    }
  }

  console.log(`\nDone.`)
}

importVehicles().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
