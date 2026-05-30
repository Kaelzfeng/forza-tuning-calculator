// check-supabase-env.mjs — Validate deployment prerequisites
// Usage: npm run check:supabase

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

function ok(msg) {
  console.log(`  ✓ ${msg}`)
}

function fail(msg) {
  console.log(`  ✗ ${msg}`)
}

let exitCode = 0

// ── 1. Supabase CLI ──
console.log("Supabase CLI")
try {
  const version = execSync("supabase --version", { encoding: "utf-8", stdio: "pipe" })
  ok(`supabase CLI found — ${version.trim()}`)
} catch {
  fail("supabase CLI not found — install: npm i -g supabase")
  exitCode = 1
}

// ── 2. config.toml ──
console.log("\nsupabase/config.toml")
const configPath = resolve(ROOT, "supabase", "config.toml")
if (existsSync(configPath)) {
  ok("supabase/config.toml exists")
} else {
  fail("supabase/config.toml missing — run: supabase init")
  exitCode = 1
}

// ── 3. Webhook function ──
console.log("\nsupabase/functions/paddle-webhook/")
const fnPath = resolve(ROOT, "supabase", "functions", "paddle-webhook", "index.ts")
if (existsSync(fnPath)) {
  ok("supabase/functions/paddle-webhook/index.ts exists")
} else {
  fail("supabase/functions/paddle-webhook/index.ts missing")
  exitCode = 1
}

// ── 4. .env.local ──
console.log("\n.env.local")
const envPath = resolve(ROOT, ".env.local")
if (existsSync(envPath)) {
  ok(".env.local exists")

  const content = readFileSync(envPath, "utf-8")
  const lines = content.split("\n")

  const required = ["PADDLE_WEBHOOK_SECRET", "SERVICE_ROLE_KEY"]
  const forbidden = "SUPABASE_SERVICE_ROLE_KEY"

  let hasForbidden = false
  for (const line of lines) {
    if (line.trim().startsWith(`${forbidden}=`)) {
      hasForbidden = true
    }
  }

  if (hasForbidden) {
    fail(`.env.local contains SUPABASE_SERVICE_ROLE_KEY — rename to SERVICE_ROLE_KEY before deploying`)
    exitCode = 1
  }

  for (const key of required) {
    const found = lines.some((l) => l.trim().startsWith(`${key}=`) && l.trim().length > key.length + 1)
    if (found) {
      ok(`${key}=[set]`)
    } else {
      fail(`${key}=[missing or empty]`)
      exitCode = 1
    }
  }
} else {
  fail(".env.local missing — create it from .env.example")
  exitCode = 1
}

// ── Summary ──
console.log()
if (exitCode === 0) {
  console.log("All checks passed ✓")
} else {
  console.log("Some checks failed ✗ — fix issues above, then run: npm run deploy:paddle-webhook")
}

process.exit(exitCode)
