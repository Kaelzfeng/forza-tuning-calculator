export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-+/g, '-')
}

export function generateSlug(manufacturer, name, year) {
  const parts = []
  if (manufacturer) parts.push(slugify(manufacturer))
  if (name) parts.push(slugify(name))
  if (year) parts.push(String(year))
  return parts.join('-') || 'unknown'
}
