import { createHmac, randomUUID } from "node:crypto"

// ── Load .env.local ──
import dotenv from "dotenv"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "..", ".env.local") })

// ── Config ──
const WEBHOOK_URL = process.env.LOCAL_WEBHOOK_URL
const SECRET = process.env.PADDLE_WEBHOOK_SECRET
const TEST_USER_ID = process.env.TEST_USER_ID
const TEST_EMAIL = process.env.TEST_EMAIL

if (!WEBHOOK_URL || !SECRET) {
  console.error("Missing required env vars. Set in .env.local:")
  console.error("  LOCAL_WEBHOOK_URL")
  console.error("  PADDLE_WEBHOOK_SECRET")
  if (!TEST_USER_ID) console.error("  TEST_USER_ID     (optional — profile lookup skipped)")
  if (!TEST_EMAIL) console.error("  TEST_EMAIL       (optional — profile lookup skipped)")
  process.exit(1)
}

// ── Signing (same algorithm as paddle-webhook/index.ts) ──
function sign(body) {
  const ts = String(Math.floor(Date.now() / 1000))
  const payload = `${ts}:${body}`
  const h1 = createHmac("sha256", SECRET).update(payload).digest("hex")
  return `ts=${ts};h1=${h1}`
}

// ── Generate test events ──
function buildEvent(type) {
  const id = `evt_test_${randomUUID().replace(/-/g, "")}`

  const base = {
    event_id: id,
    event_type: type,
    occurred_at: new Date().toISOString(),
    notification_id: `noti_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    data: {
      custom_data: {
        user_id: TEST_USER_ID || "test-user-uuid",
        email: TEST_EMAIL || "test@example.com",
        plan: "pro",
      },
    },
  }

  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()

  switch (type) {
    case "transaction.completed":
      base.data.id = `txn_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      base.data.status = "completed"
      base.data.customer_id = "ctm_test123"
      base.data.items = [{ price: { id: "pri_test", description: "Pro Monthly" }, quantity: 1 }]
      base.data.details = {
        billing_period: { starts_at: new Date().toISOString(), ends_at: expires },
      }
      break

    case "subscription.created":
      base.data.id = `sub_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      base.data.status = "active"
      base.data.customer_id = "ctm_test123"
      base.data.current_billing_period = {
        starts_at: new Date().toISOString(),
        ends_at: expires,
      }
      break

    case "subscription.updated":
      base.data.id = `sub_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      base.data.status = "past_due"
      base.data.customer_id = "ctm_test123"
      base.data.current_billing_period = {
        starts_at: new Date().toISOString(),
        ends_at: expires,
      }
      break

    case "subscription.canceled":
      base.data.id = `sub_test_${randomUUID().replace(/-/g, "").slice(0, 16)}`
      base.data.status = "canceled"
      base.data.customer_id = "ctm_test123"
      break

    default:
      break
  }

  return base
}

// ── Send ──
async function sendEvent(event) {
  const body = JSON.stringify(event)
  const sigHeader = sign(body)

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Paddle-Signature": sigHeader,
    },
    body,
  })

  let responseBody
  try {
    responseBody = await res.text()
  } catch {
    responseBody = "<could not read body>"
  }

  return {
    status: res.status,
    body: responseBody,
    eventId: event.event_id,
    eventType: event.event_type,
  }
}

// ── Main ──
const targetEvent = process.argv[2] || null

const ALL_EVENTS = [
  "transaction.completed",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
]

const eventsToSend = targetEvent
  ? [targetEvent]
  : ALL_EVENTS

console.log("════════════════════════════════════════")
console.log("Paddle Webhook Test")
console.log("════════════════════════════════════════")
console.log(`Webhook URL:  ${WEBHOOK_URL}`)
console.log(`Test User ID: ${TEST_USER_ID || "(not set)"}`)
console.log(`Test Email:   ${TEST_EMAIL || "(not set)"}`)
console.log(`Secret:       [${SECRET.length} chars]`)
console.log(`Events:       ${eventsToSend.length > 1 ? "all" + " 4" : "1"} event(s)`)
console.log("────────────────────────────────────────\n")

let passed = 0
let failed = 0

for (const eventType of eventsToSend) {
  const event = buildEvent(eventType)

  console.log(`SEND  ${eventType}`)
  console.log(`      event_id: ${event.event_id}`)

  try {
    const result = await sendEvent(event)
    const ok = result.status === 200
    const marker = ok ? "OK" : "FAIL"
    console.log(`      status:   ${result.status} ${marker}`)
    console.log(`      body:     ${result.body}`)

    if (ok) {
      console.log(`      ✓ verified (signature accepted)`)
      passed++
    } else {
      console.log(`      ✗ response ${result.status}`)
      failed++
    }
  } catch (err) {
    console.log(`      ✗ network error: ${err.message}`)
    failed++
  }

  console.log()

  // Small delay between events so timestamps differ
  if (eventsToSend.length > 1 && eventType !== eventsToSend[eventsToSend.length - 1]) {
    await new Promise((r) => setTimeout(r, 200))
  }
}

console.log("────────────────────────────────────────")
console.log(`Results: ${passed} passed / ${failed} failed / ${passed + failed} total`)

if (passed > 0) {
  console.log("\n✓ Webhook signature verification works")
  console.log("  Check Supabase → subscription_events for the test rows")
  console.log("  Check Supabase → profiles for plan/subscription updates")
}

if (failed > 0) {
  console.log("\n✗ Some events failed. Check:")
  console.log("  - Is the function running? supabase functions serve --no-verify-jwt")
  console.log("  - Are env vars set on the function?")
  process.exit(1)
}
