import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Env ──
const PADDLE_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const VALID_EVENTS = new Set([
  "transaction.completed",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
])

// ── Helpers ──

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

async function verifySignature(body: string, header: string): Promise<boolean> {
  try {
    const tsMatch = header.match(/ts=(\d+)/)
    const h1Match = header.match(/h1=([a-f0-9]+)/)
    if (!tsMatch || !h1Match) return false

    const ts = tsMatch[1]
    const h1 = h1Match[1]

    // 5 min tolerance
    const nowSec = Math.floor(Date.now() / 1000)
    if (Math.abs(nowSec - parseInt(ts)) > 300) return false

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(PADDLE_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    )

    return await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(h1),
      encoder.encode(`${ts}:${body}`),
    )
  } catch {
    return false
  }
}

function extractCustomData(data: Record<string, unknown>): {
  userId: string | null
  email: string | null
  plan: string
} {
  const cd = (data.custom_data ?? {}) as Record<string, unknown>
  return {
    userId: typeof cd.user_id === "string" ? cd.user_id : null,
    email: typeof cd.email === "string" ? cd.email : null,
    plan: typeof cd.plan === "string" ? cd.plan : "pro",
  }
}

function extractPayloadEmail(data: Record<string, unknown>, customEmail: string | null): string | null {
  if (customEmail) return customEmail
  // fallbacks in priority order
  const paths = ["email", "customer_email", "username"]
  for (const path of paths) {
    const v = data[path]
    if (typeof v === "string") return v
  }
  return null
}

function extractExpiresAt(data: Record<string, unknown>): string | null {
  // subscription events
  const billing = data.current_billing_period as Record<string, unknown> | undefined
  if (billing?.ends_at && typeof billing.ends_at === "string") return billing.ends_at
  // transaction events
  const details = data.details as Record<string, unknown> | undefined
  if (details?.billing_period?.ends_at && typeof details.billing_period.ends_at === "string") {
    return details.billing_period.ends_at
  }
  // direct fields
  if (data.next_billed_at && typeof data.next_billed_at === "string") return data.next_billed_at
  return null
}

function extractStatus(eventType: string, data: Record<string, unknown>): string {
  switch (eventType) {
    case "transaction.completed":
      return "completed"
    case "subscription.created":
      return "active"
    case "subscription.updated": {
      const s = data.status
      return typeof s === "string" ? s : "active"
    }
    case "subscription.canceled":
      return "canceled"
    default:
      return "unknown"
  }
}

// ── DB helpers ──

async function insertEvent(payload: {
  eventId: string
  eventType: string
  userId: string | null
  email: string | null
  plan: string
  status: string
  rawPayload: unknown
}): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from("subscription_events").insert({
    provider: "paddle",
    event_id: payload.eventId,
    event_type: payload.eventType,
    user_id: payload.userId,
    email: payload.email,
    plan: payload.plan,
    status: payload.status,
    raw_payload: payload.rawPayload,
    processed_at: new Date().toISOString(),
  })
  if (error) {
    console.error("insertEvent failed:", error.message ?? String(error))
    return { ok: false, error: error.message ?? "Unknown insert error" }
  }
  return { ok: true, error: null }
}

async function findProfile(userId: string | null, email: string | null): Promise<{ id: string } | null> {
  // prefer user_id
  if (userId) {
    const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle()
    if (data) return data as { id: string }
  }
  // fallback by email via auth.users -> profiles
  if (email) {
    const { data: authUser } = await supabase.auth.admin.listUsers()
    // auth.admin.listUsers returns paginated; we need a different approach
    // Try to find profile by matching email via a direct query if profiles has email field
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    if (profileByEmail) return profileByEmail as { id: string }

    // If profiles doesn't have email, we can't match by email — return null
    // The userId from custom_data is the primary link
  }
  return null
}

// ── Main ──

async function handleRequest(req: Request): Promise<Response> {
  // Only POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  // Verify signature
  const sigHeader = req.headers.get("Paddle-Signature")
  if (!sigHeader) {
    return new Response("Missing signature", { status: 401 })
  }

  const body = await req.text()
  const valid = await verifySignature(body, sigHeader)
  if (!valid) {
    return new Response("Invalid signature", { status: 401 })
  }

  // Parse body
  let json: Record<string, unknown>
  try {
    json = JSON.parse(body)
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const eventId = typeof json.event_id === "string" ? json.event_id : null
  const eventType = typeof json.event_type === "string" ? json.event_type : null

  if (!eventId || !eventType) {
    return new Response("Missing event_id or event_type", { status: 400 })
  }

  // Only process known events
  if (!VALID_EVENTS.has(eventType)) {
    console.log("Skipping unsupported event:", eventType)
    return new Response("OK", { status: 200 })
  }

  // Dedup
  const { data: existing, error: dedupErr } = await supabase
    .from("subscription_events")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle()

  if (dedupErr) {
    console.error("Dedup query failed:", dedupErr.message ?? String(dedupErr))
    return new Response("Internal error", { status: 500 })
  }

  if (existing) {
    console.log("Duplicate event skipped:", eventId)
    return new Response("OK", { status: 200 })
  }

  const data = (json.data ?? {}) as Record<string, unknown>

  // Extract metadata
  const { userId, email: customEmail, plan } = extractCustomData(data)
  const email = extractPayloadEmail(data, customEmail)
  const status = extractStatus(eventType, data)

  console.log("Processing webhook:", {
    event_type: eventType,
    user_id: userId,
    email: email ?? "unknown",
  })

  // Insert event log
  const eventResult = await insertEvent({
    eventId,
    eventType,
    userId,
    email,
    plan,
    status,
    rawPayload: json,
  })

  if (!eventResult.ok) {
    return new Response("Failed to write audit log", { status: 500 })
  }

  // Match user & update profile
  const profile = await findProfile(userId, email)

  if (!profile) {
    console.log("No matching profile — event logged, no profile update")
    return new Response("OK", { status: 200 })
  }

  if (eventType === "subscription.canceled") {
    // Only mark inactive, don't delete data
    await supabase.from("profiles").update({
      subscription_status: "inactive",
    }).eq("id", profile.id)
  } else {
    const expiresAt = extractExpiresAt(data)
    const update: Record<string, unknown> = {
      plan: "pro",
      subscription_status: status,
    }
    if (expiresAt) {
      update.subscription_expires_at = expiresAt
    }
    await supabase.from("profiles").update(update).eq("id", profile.id)
  }

  return new Response("OK", { status: 200 })
}

Deno.serve(handleRequest)
