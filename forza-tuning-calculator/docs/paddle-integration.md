# Paddle Integration

## Overview

Paddle is the payment provider for FH6 Pro subscriptions. This document tracks integration status, required env vars, and remaining work.

## Status

| Component | Status |
|---|---|
| Frontend checkout trigger | Done (`src/views/UpgradeView.vue`) |
| Paddle.js loader | Done (`src/lib/paddle.js`) |
| Webhook endpoint (Edge Function) | Done (`supabase/functions/paddle-webhook/`) |
| subscription_events table | SQL ready (run manually) |
| profiles plan update (webhook) | Done (webhook handler) |
| Pro access gating | Done (tunes_public / tunes split) |

## Environment Variables

### Frontend (Vite — `VITE_` prefix)

| Variable | Purpose |
|---|---|
| `VITE_PADDLE_ENV` | `sandbox` or `production` |
| `VITE_PADDLE_CLIENT_TOKEN` | Paddle client-side token |
| `VITE_PADDLE_PRO_PRICE_ID` | Price ID for the Pro monthly plan |

### Server-side (Supabase Edge Function / webhook)

| Variable | Purpose |
|---|---|
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook signing secret |
| `SERVICE_ROLE_KEY` | Supabase service_role key for DB writes |

## subscription_events Table

- **Path:** `supabase/sql/subscription_events.sql`
- **Purpose:** Audit log for all Paddle webhook events
- **Access:** Users can SELECT own rows; INSERT/UPDATE/DELETE via service_role only
- **Run:** Manually in Supabase SQL Editor

## profiles Fields Updated by Webhook

The webhook handler (future Edge Function) updates these columns on `public.profiles`:

| Column | Set by |
|---|---|
| `plan` | Webhook — `pro` or `elite` on subscription created |
| `subscription_status` | Webhook — `active`, `past_due`, `canceled`, etc. |
| `subscription_expires_at` | Webhook — next billing date from Paddle |

Users must NOT be able to update these fields directly (enforced via RLS).

## Paddle Sandbox Setup

### 1. Create a Paddle Sandbox Account

1. Go to [paddle.com](https://paddle.com) and sign up
2. Switch to **Sandbox** mode (top-left dropdown → Sandbox)
3. Navigate to **Products** → **Catalog**

### 2. Create the Pro Product

1. Click **New Product** → **Subscription**
2. Set **Name:** `FH6 Pro Membership`
3. Set **Description:** `Full tuning values, copy presets, save builds, favorites, and advanced calculator tools`
4. Under **Pricing**, add a monthly price:
   - **Price name:** `Pro Monthly`
   - **Billing interval:** Monthly
   - **Amount:** `$4.99` (or your chosen price)
   - **Currency:** USD
5. Click **Save**

### 3. Copy Client-side Token

1. Go to **Developer Tools** → **Authentication**
2. Under **Client-side tokens**, copy the **Sandbox** token
3. Paste into your `.env.local` as `VITE_PADDLE_CLIENT_TOKEN`

### 4. Copy Price ID

1. Go to **Products** → **Catalog**
2. Click on the `FH6 Pro Membership` product
3. Copy the **Price ID** (starts with `pri_`)
4. Paste into your `.env.local` as `VITE_PADDLE_PRO_PRICE_ID`

### 5. `.env.local` Example

```env
VITE_PADDLE_ENV=sandbox
VITE_PADDLE_CLIENT_TOKEN=test_abcdef1234567890
VITE_PADDLE_PRO_PRICE_ID=pri_01abcdefghijklmnop
```

> Never commit `.env.local` — it's already in `.gitignore`.

### 6. Testing in Sandbox

- Run the app with `npm run dev`
- Sign in, go to `/upgrade`, click **Upgrade Now**
- Paddle overlay opens in sandbox mode
- Use Paddle's [test cards](https://developer.paddle.com/build/sandbox-test-cards) to simulate payments
- Sandbox checkout does NOT charge real cards

## Webhook (Implemented)

- **Path:** `supabase/functions/paddle-webhook/index.ts`
- **Docs:** `supabase/functions/paddle-webhook/README.md`
- **URL:** `https://<PROJECT_ID>.supabase.co/functions/v1/paddle-webhook`

## Deploy

```bash
npm run check:supabase          # Validate env & CLI
npm run deploy:paddle-webhook   # Upload secrets + deploy function
```

## Local Webhook Testing

### 1. Start the function locally

```bash
npx supabase functions serve --no-verify-jwt
# → http://localhost:54321/functions/v1/paddle-webhook
```

### 2. Configure `.env.local`

```env
LOCAL_WEBHOOK_URL=http://localhost:54321/functions/v1/paddle-webhook
PADDLE_WEBHOOK_SECRET=<same secret used in the function>
SERVICE_ROLE_KEY=<service_role key>
TEST_USER_ID=<a real user id from auth.users>
TEST_EMAIL=<matching email>
```

### 3. Run tests

```bash
npm run test:paddle-webhook
```

### 4. Verify in Supabase

```sql
SELECT * FROM subscription_events ORDER BY created_at DESC LIMIT 4;
SELECT id, plan, subscription_status, subscription_expires_at FROM profiles WHERE id = '<TEST_USER_ID>';
```

### 5. Verify dedup

Run the test a second time — all 4 events should return 200 (OK) with no new rows inserted.

