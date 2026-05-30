/**
 * Browser Console Script — Extract FH6 Car List
 *
 * 1. Open https://forza.net/fh6cars in your browser
 * 2. Wait for the page to fully load (car grid visible)
 * 3. Press F12 → Console
 * 4. Paste this entire script and press Enter
 * 5. A JSON file will download — save it
 * 6. Run: node scripts/import-forza-vehicles.mjs --json cars.json --dry-run
 * 7. If data looks correct: node scripts/import-forza-vehicles.mjs --json cars.json --apply
 */

(function extractCarList() {
  const cars = [];

  // Strategy 1: Look for Nuxt/Vue reactive data
  const app = document.querySelector('#__nuxt') || document.querySelector('#app') || document.querySelector('[data-v-]');
  if (app && app.__vue_app__) {
    const vm = app.__vue_app__;
    // Walk the component tree looking for car data
    function walk(obj, depth) {
      if (!obj || depth > 8) return;
      if (Array.isArray(obj) && obj.length > 5 && obj[0] && obj[0].manufacturer) {
        obj.forEach(c => {
          cars.push({
            manufacturer: c.manufacturer || c.make || c.brand || '',
            model: c.model || c.name || c.title || '',
            year: c.year || c.modelYear || null,
            drivetrain: c.drivetrain || c.drive || null,
            class: c.class || c.class_tier || c.piClass || null,
            horsepower: c.horsepower || c.hp || c.power || null,
          });
        });
      }
      if (Array.isArray(obj)) { obj.forEach(o => walk(o, depth + 1)); return; }
      if (typeof obj === 'object') {
        // Check for car-like data patterns
        if (obj.manufacturer && obj.name) {
          cars.push({
            manufacturer: obj.manufacturer,
            model: obj.name || obj.model,
            year: obj.year || obj.modelYear || null,
            drivetrain: obj.drivetrain || obj.drive || null,
            class: obj.class || obj.class_tier || obj.piClass || null,
            horsepower: obj.horsepower || obj.hp || obj.power || null,
          });
          return;
        }
        const keys = Object.keys(obj);
        for (const k of keys) {
          if (k === 'el' || k === 'parent' || k === 'root' || k === 'refs' || k.startsWith('_') || k.startsWith('$')) continue;
          try { walk(obj[k], depth + 1); } catch {}
        }
      }
    }
    walk(vm, 0);
  }

  // Strategy 2: Parse DOM — look for car cards with data attributes
  if (cars.length === 0) {
    document.querySelectorAll('[data-manufacturer], [data-make], [data-brand], .car-card, .vehicle-card, [class*="car"], [class*="vehicle"]').forEach(el => {
      const mfr = el.dataset?.manufacturer || el.dataset?.make || el.dataset?.brand;
      const model = el.dataset?.model || el.dataset?.name;
      if (mfr && model) {
        cars.push({
          manufacturer: mfr,
          model: model,
          year: el.dataset?.year || null,
          drivetrain: el.dataset?.drivetrain || null,
          class: el.dataset?.class || null,
          horsepower: el.dataset?.horsepower || el.dataset?.hp || null,
        });
      }
    });
  }

  // Strategy 3: Text content from table/grid
  if (cars.length === 0) {
    const items = document.querySelectorAll('table tr, [role="row"], .grid > *');
    items.forEach(row => {
      const text = row.textContent.trim();
      const match = text.match(/^(\d{4})\s+(.+?)\s+([A-Z0-9][A-Za-z0-9\s\-/]+)$/);
      if (match) {
        cars.push({ manufacturer: match[2].trim(), model: match[3].trim(), year: parseInt(match[1]) });
      }
    });
  }

  // Strategy 4: Look for Strapi API response in network cache
  if (cars.length === 0) {
    console.log('No cars found in DOM/Vue state. Trying performance API...');
    const entries = performance.getEntriesByType('resource');
    for (const entry of entries) {
      if (entry.name.includes('strapi') && (entry.name.includes('car') || entry.name.includes('vehicle'))) {
        console.log('Found Strapi API call:', entry.name);
        console.log('Open this URL in a new tab to get the JSON data, save it as cars.json');
      }
    }
  }

  if (cars.length === 0) {
    console.error('Could not extract car data. Please check:');
    console.error('1. The page is fully loaded (scroll down to see cars)');
    console.error('2. Try the Strapi API directly — open Network tab, refresh, look for /api/ requests');
    return;
  }

  // Download as JSON
  const json = JSON.stringify(cars, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fh6-cars.json';
  a.click();
  URL.revokeObjectURL(url);

  console.log(`Extracted ${cars.length} cars! Saved as fh6-cars.json`);
  console.log('First 5:');
  console.table(cars.slice(0, 5));
  console.log('\nNext step:');
  console.log('  node scripts/import-forza-vehicles.mjs --json fh6-cars.json --dry-run --limit 5');
})();
