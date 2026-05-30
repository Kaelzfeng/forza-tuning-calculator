import { onUnmounted } from 'vue'

export function useSeoMeta(config) {
  const defaults = {
    title: 'Forza Tuning Calculator | Tune Setup Generator',
    description: 'Generate stable Forza tuning setups for Road, Drift, Dirt and Drag builds. Free tuning calculator with suspension, tire pressure, gearing, and differential recommendations.',
    ogTitle: 'Forza Tuning Calculator | Tune Setup Generator',
    ogDescription: 'Generate stable Forza tuning setups for Road, Drift, Dirt and Drag builds.',
    ogType: 'website',
    ogImage: null,
    ogUrl: null,
    twitterCard: 'summary_large_image',
    canonical: null,
    jsonLd: null,
  }

  const opts = { ...defaults, ...config }

  // -- Title --
  document.title = opts.title

  // -- Meta description --
  setMeta('name', 'description', opts.description)

  // -- Open Graph --
  setMeta('property', 'og:title', opts.ogTitle || opts.title)
  setMeta('property', 'og:description', opts.ogDescription || opts.description)
  setMeta('property', 'og:type', opts.ogType)
  if (opts.ogImage) setMeta('property', 'og:image', opts.ogImage)
  if (opts.ogUrl) setMeta('property', 'og:url', opts.ogUrl)

  // -- Twitter Card --
  setMeta('name', 'twitter:card', opts.twitterCard)
  setMeta('name', 'twitter:title', opts.ogTitle || opts.title)
  setMeta('name', 'twitter:description', opts.ogDescription || opts.description)
  if (opts.ogImage) setMeta('name', 'twitter:image', opts.ogImage)

  // -- Canonical --
  setLink('canonical', opts.canonical || window.location.href)

  // -- JSON-LD --
  let jsonLdEl = null
  if (opts.jsonLd) {
    jsonLdEl = document.createElement('script')
    jsonLdEl.type = 'application/ld+json'
    jsonLdEl.textContent = JSON.stringify(opts.jsonLd, null, 2)
    document.head.appendChild(jsonLdEl)
  }

  onUnmounted(() => {
    // Reset to site defaults
    document.title = defaults.title
    setMeta('name', 'description', defaults.description)
    setMeta('property', 'og:title', defaults.ogTitle)
    setMeta('property', 'og:description', defaults.ogDescription)
    setMeta('property', 'og:type', 'website')
    removeMeta('property', 'og:image')
    removeMeta('property', 'og:url')
    setMeta('name', 'twitter:card', defaults.twitterCard)
    setMeta('name', 'twitter:title', defaults.ogTitle)
    setMeta('name', 'twitter:description', defaults.ogDescription)
    removeMeta('name', 'twitter:image')
    setLink('canonical', window.location.origin)
    if (jsonLdEl && jsonLdEl.parentNode) {
      jsonLdEl.parentNode.removeChild(jsonLdEl)
    }
  })
}

function setMeta(attr, name, content) {
  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function removeMeta(attr, name) {
  const el = document.querySelector(`meta[${attr}="${name}"]`)
  if (el) el.parentNode.removeChild(el)
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function makeBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function makeVehicleSchema(vehicle) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.manufacturer} ${vehicle.name}`,
    manufacturer: { '@type': 'Brand', name: vehicle.manufacturer },
    productionDate: vehicle.year ? String(vehicle.year) : undefined,
    driveWheelConfiguration: vehicle.drivetrain === 'AWD' ? 'https://schema.org/AllWheelDriveConfiguration'
      : vehicle.drivetrain === 'RWD' ? 'https://schema.org/RearWheelDriveConfiguration'
      : vehicle.drivetrain === 'FWD' ? 'https://schema.org/FrontWheelDriveConfiguration'
      : undefined,
    vehicleEngine: vehicle.engine ? {
      '@type': 'EngineSpecification',
      name: vehicle.engine,
    } : undefined,
    description: vehicle.description || undefined,
  }
}

export function makeTuneSchema(tune) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: tune.title || tune.personality_title || 'Forza Tune',
    author: tune.author_name ? { '@type': 'Person', name: tune.author_name } : undefined,
    dateCreated: tune.created_at,
    description: tune.description || `${tune.build_type} tune with ${tune.driving_style} handling. ${tune.power_hp} HP, ${tune.weight_kg} kg.`,
    about: tune.vehicle_name ? { '@type': 'Car', name: tune.vehicle_name } : undefined,
  }
}

export function makeCollectionSchema(name, description, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    isPartOf: { '@type': 'WebSite', name: 'Forza Tuning Calculator', url: window.location.origin },
  }
}
