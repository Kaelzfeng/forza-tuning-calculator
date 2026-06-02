-- ═══════════════════════════════════════════════════
-- subscription_events — Payment webhook audit log
-- ═══════════════════════════════════════════════════
-- Run this in Supabase SQL Editor.
-- Writes are done by Edge Functions / webhooks using service_role.
-- Users can only read their own events.
-- ═══════════════════════════════════════════════════

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'paddle',
  event_id text unique,
  event_type text,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  plan text,
  status text,
  raw_payload jsonb,
  processed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.subscription_events enable row level security;

create policy "Users can read own subscription events"
on public.subscription_events
for select
using (auth.uid() = user_id);

-- Note: No INSERT / UPDATE / DELETE policies for users.
-- Webhook / Edge Function writes use service_role.
