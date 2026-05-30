import { cpSync, mkdirSync, existsSync } from 'fs'

const src = 'data/vehicles.json'
const dst = 'public/data/vehicles.json'

if (!existsSync(src)) {
  console.error(`${src} not found`)
  process.exit(1)
}

mkdirSync('public/data', { recursive: true })
cpSync(src, dst)
console.log(`Copied ${src} -> ${dst}`)
