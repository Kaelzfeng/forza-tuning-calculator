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

  // -- JSON-LD (supports single object or @graph array) --
  let jsonLdEl = null
  if (opts.jsonLd) {
    jsonLdEl = document.createElement('script')
    jsonLdEl.type = 'application/ld+json'
    if (Array.isArray(opts.jsonLd)) {
      jsonLdEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': opts.jsonLd,
      }, null, 2)
    } else {
      jsonLdEl.textContent = JSON.stringify(opts.jsonLd, null, 2)
    }
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

/**
 * Product schema for vehicle detail pages.
 * Enhances SEO with price, brand, and structured properties.
 */
export function makeProductSchema(vehicle) {
  const props = []
  if (vehicle.horsepower) props.push({ '@type': 'PropertyValue', name: 'Horsepower', value: String(vehicle.horsepower) })
  if (vehicle.weight) props.push({ '@type': 'PropertyValue', name: 'Weight (kg)', value: String(vehicle.weight) })
  if (vehicle.drivetrain) props.push({ '@type': 'PropertyValue', name: 'Drivetrain', value: vehicle.drivetrain })
  if (vehicle.class) props.push({ '@type': 'PropertyValue', name: 'Class', value: vehicle.class })
  if (vehicle.year) props.push({ '@type': 'PropertyValue', name: 'Year', value: String(vehicle.year) })

  return {
    '@type': 'Product',
    name: `${vehicle.manufacturer} ${vehicle.name}`,
    brand: { '@type': 'Brand', name: vehicle.manufacturer },
    description: vehicle.description || `${vehicle.manufacturer} ${vehicle.name} — ${vehicle.horsepower || 'N/A'} HP, ${vehicle.drivetrain || 'N/A'}, Class ${vehicle.class || 'N/A'}.`,
    image: vehicle.image_url || vehicle.thumbnail_url || undefined,
    category: vehicle.class ? `Forza ${vehicle.class} Class Vehicle` : 'Forza Vehicle',
    ...(props.length > 0 ? { additionalProperty: props } : {}),
  }
}

/**
 * ItemList schema for ranking/list pages.
 * Each item must have { name, url }.
 */
export function makeItemListSchema(listName, description, items, itemCount) {
  return {
    '@type': 'ItemList',
    name: listName,
    description,
    numberOfItems: itemCount || items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
      ...(item.image ? { image: item.image } : {}),
    })),
  }
}

/**
 * SoftwareApplication schema for the Calculator page.
 */
export function makeSoftwareAppSchema() {
  return {
    '@type': 'SoftwareApplication',
    name: 'Forza Tuning Calculator',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    description: 'Free Forza tuning calculator generating suspension, differential, gearing, and tire pressure setups for Road, Drift, Dirt, and Drag builds.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Organization', name: 'Forza Tuning Calculator' },
  }
}

/**
 * Convenience: BreadcrumbList from simple [{name, url}] pairs.
 * Already exported above — kept for backward compatibility.
 */
