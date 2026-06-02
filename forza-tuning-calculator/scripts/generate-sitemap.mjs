import 'dotenv/config'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

const SITE_URL = (process.env.VITE_SITE_URL || 'https://forzatuningcalculator.com').replace(/\/+$/, '')

const routesPath = resolve('prerender-routes.json')
if (!existsSync(routesPath)) {
  console.error('prerender-routes.json not found. Run "npm run prerender:routes" first.')
  process.exit(1)
}

const routes = JSON.parse(readFileSync(routesPath, 'utf-8'))

// ── Priority & changefreq ──
function entry(route) {
  let priority = '0.7'
  let changefreq = 'monthly'

  if (route === '/') {
    priority = '1.0'
    changefreq = 'weekly'
  } else if (route === '/vehicles') {
    priority = '0.9'
    changefreq = 'daily'
  }

  const loc = `${SITE_URL}${route}`

  return `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

// ── Generate sitemap.xml ──
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(entry).join('\n')}
</urlset>
`

const targets = ['public']
if (existsSync('dist')) targets.push('dist')

for (const dir of targets) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, 'sitemap.xml'), sitemap, 'utf-8')
  console.log(`Wrote ${dir}/sitemap.xml (${routes.length} URLs)`)
}

// ── Generate robots.txt ──
const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

for (const dir of targets) {
  writeFileSync(resolve(dir, 'robots.txt'), robots, 'utf-8')
  console.log(`Wrote ${dir}/robots.txt`)
}

// ── Summary ──
console.log(`\nSitemap URL: ${SITE_URL}/sitemap.xml`)
console.log(`Site URL:    ${SITE_URL}`)
