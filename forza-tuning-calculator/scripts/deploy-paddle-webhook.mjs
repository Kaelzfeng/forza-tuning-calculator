// deploy-paddle-webhook.mjs — Standardized webhook deployment
// Usage: npm run deploy:paddle-webhook

import { execSync } from "node:child_process"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, "..")

function run(cmd, label) {
  let stdout = ""
  try {
    stdout = execSync(cmd, { cwd: ROOT, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] })
  } catch (e) {
    console.error(`\n✗ ${label} failed`)
    console.error(`  command:  ${cmd}`)
    console.error(`  exitCode: ${e.status}`)
    if (e.stdout) console.error(`  stdout:\n${e.stdout.trimEnd()}`)
    if (e.stderr) console.error(`  stderr:\n${e.stderr.trimEnd()}`)
    process.exit(1)
  }
  if (stdout.trim()) console.log(stdout.trimEnd())
}

// ── Step 0: Pre-flight check ──
console.log("═".repeat(44))
console.log("Step 0: Pre-flight check")
console.log("═".repeat(44) + "\n")

run("node scripts/check-supabase-env.mjs", "check:supabase")

// ── Step 1: Set secrets ──
console.log("\n" + "═".repeat(44))
console.log("Step 1: Upload secrets from .env.local")
console.log("═".repeat(44) + "\n")

run("supabase secrets set --env-file .env.local", "secrets set")

// ── Step 2: Deploy function ──
console.log("\n" + "═".repeat(44))
console.log("Step 2: Deploy paddle-webhook function")
console.log("═".repeat(44) + "\n")

run("supabase functions deploy paddle-webhook", "functions deploy")

// ── Done ──
console.log("\n" + "═".repeat(44))
console.log("Deploy complete")
console.log("═".repeat(44))
console.log("\nWebhook URL: https://<PROJECT_ID>.supabase.co/functions/v1/paddle-webhook")
console.log("Register this URL in Paddle -> Developer Tools -> Notifications")
