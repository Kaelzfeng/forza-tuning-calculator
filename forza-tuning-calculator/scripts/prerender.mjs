import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { createServer } from 'http'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distRoot = resolve(__dirname, '..', 'dist')
const routesPath = resolve(__dirname, '..', 'prerender-routes.json')

if (!existsSync(routesPath)) {
  console.error('prerender-routes.json not found. Run "npm run prerender:routes" first.')
  process.exit(1)
}

const routes = JSON.parse(readFileSync(routesPath, 'utf-8'))

// ── SPA fallback static server ──
function startServer(port = 4173) {
  return new Promise((resolveServer) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.txt': 'text/plain',
      '.xml': 'application/xml',
    }

    const server = createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`)
      let filePath = join(distRoot, url.pathname === '/' ? 'index.html' : url.pathname)

      // If the path doesn't have an extension or doesn't exist, serve index.html (SPA fallback)
      const ext = filePath.match(/\.[a-z]+$/i)
      if (!ext || !existsSync(filePath)) {
        filePath = join(distRoot, 'index.html')
      }

      if (!existsSync(filePath)) {
        res.writeHead(404)
        res.end('Not Found')
        return
      }

      const contentType = mimeTypes[(ext ? ext[0] : '.html').toLowerCase()] || 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': contentType })
      const content = readFileSync(filePath)
      res.end(content)
    })

    server.listen(port, () => {
      console.log(`Static server started on http://localhost:${port}`)
      resolveServer({ server, port })
    })
  })
}

// ── Puppeteer prerender ──
async function prerender() {
  // Dynamic import so puppeteer isn't required at module parse time
  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    console.error('puppeteer is not installed. Run: npm install -D puppeteer')
    process.exit(1)
  }

  const { server, port } = await startServer()
  const baseUrl = `http://localhost:${port}`

  const browser = await puppeteer.launch({ headless: true })
  const total = routes.length
  let done = 0
  let failed = 0

  console.log(`\nPrerendering ${total} routes...\n`)

  for (const route of routes) {
    const url = `${baseUrl}${route}`
    const page = await browser.newPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

      // Wait for Vue app to signal readiness
      await page.waitForFunction(
        () => window.__PRERENDER_READY === true,
        { timeout: 15000 }
      )

      const html = await page.content()

      // Write to dist/<route>/index.html
      const outDir = join(distRoot, route.replace(/^\//, ''))
      mkdirSync(outDir, { recursive: true })
      const outPath = join(outDir, 'index.html')
      writeFileSync(outPath, html, 'utf-8')

      done++
      const pct = ((done / total) * 100).toFixed(0)
      console.log(`  [${done}/${total}] ${pct}%  ${route}`)
    } catch (e) {
      failed++
      console.error(`  [FAIL] ${route}: ${e.message}`)
    } finally {
      await page.close()
    }
  }

  await browser.close()
  server.close()

  console.log(`\nDone. ${done} success, ${failed} failed.`)
}

prerender().catch((e) => {
  console.error(e)
  process.exit(1)
})
