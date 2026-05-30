# paddle-webhook

Paddle webhook handler for FH6 Pro subscription provisioning.

## Overview

Receives Paddle webhook events and:
- Verifies `Paddle-Signature` HMAC
- Logs events to `subscription_events` with deduplication
- Updates `profiles` (plan, subscription_status, subscription_expires_at)

## Supported Events

| Event | Action |
|---|---|
| `transaction.completed` | Set plan=pro, status=active, expires_at |
| `subscription.created` | Set plan=pro, status=active, expires_at |
| `subscription.updated` | Update status (active/past_due/trialing) |
| `subscription.canceled` | Set subscription_status=inactive (no data deleted) |

## User Matching

1. `custom_data.user_id` (primary — passed from frontend checkout)
2. `email` fallback (searches `profiles.email`)

If no profile is found, the event is still logged but no profile update occurs.

## Deploy

```bash
# 1. Set secrets
supabase secrets set PADDLE_WEBHOOK_SECRET=your_webhook_secret
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key

# 2. Deploy
supabase functions deploy paddle-webhook

# 3. Get webhook URL
# The URL is: https://<PROJECT_ID>.supabase.co/functions/v1/paddle-webhook
```

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `PADDLE_WEBHOOK_SECRET` | Yes | Paddle webhook signing secret |
| `SUPABASE_URL` | Yes | Supabase project URL (auto-set in Supabase) |
| `SERVICE_ROLE_KEY` | Yes | service_role key for DB writes |

## Webhook URL

```
https://<PROJECT_ID>.supabase.co/functions/v1/paddle-webhook
```

## Register in Paddle

1. Go to Paddle Sandbox → **Developer Tools** → **Notifications**
2. Add webhook endpoint with the URL above
3. Select events: `transaction.completed`, `subscription.created`, `subscription.updated`, `subscription.canceled`
4. Copy the **Webhook Secret** and set it as `PADDLE_WEBHOOK_SECRET`
5. Set the **Subscription Created** webhook to active

## Deduplication

Events are deduplicated by `event_id`. If the same `event_id` arrives again, the handler returns 200 without processing.

## Logs

The function logs `event_type`, `user_id`, and `email` to the Edge Function console. No secrets are logged.

To view logs:
```bash
supabase functions logs paddle-webhook
```
