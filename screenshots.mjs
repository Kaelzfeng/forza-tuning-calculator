import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'screenshots');
mkdirSync(outDir, { recursive: true });

const BASE = 'http://localhost:4173';

const pages = [
  { name: 'home', path: '/' },
  { name: 'calculator', path: '/calculator?mode=road' },
  { name: 'vehicles', path: '/vehicles' },
  { name: 'vehicle-detail', path: '/vehicles/2009-ferrari-458-italia' },
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.name === 'mobile' ? 3 : 2,
  });

  for (const pg of pages) {
    const page = await context.newPage();
    console.log(`Capturing: ${pg.name} @ ${vp.name} (${vp.width}x${vp.height})`);

    try {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: 'networkidle', timeout: 15000 });
      // Wait for glass effects to render
      await page.waitForTimeout(1500);

      const filename = `${pg.name}__${vp.name}.png`;
      await page.screenshot({
        path: join(outDir, filename),
        fullPage: vp.name === 'mobile',
      });
      console.log(`  ✓ ${filename}`);
    } catch (e) {
      console.log(`  ✗ ${pg.name}: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await context.close();
}

await browser.close();
console.log('\nDone! Screenshots saved to:', outDir);
