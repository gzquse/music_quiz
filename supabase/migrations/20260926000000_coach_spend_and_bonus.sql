-- Bonus analyses per account, and a log of every Claude call with its cost.
-- Run once: Supabase dashboard → SQL Editor → paste this file → Run. Safe to re-run.

-- Extra free analyses granted by an admin, on top of COACH_FREE_ANALYSES.
alter table public.coach_accounts
  add column if not exists bonus_analyses integer not null default 0;

-- One row per Claude API call (successful or not). Server-only: no student access.
create table if not exists public.coach_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Kept when a student or session is deleted, so spend history stays complete.
  user_id uuid references auth.users (id) on delete set null,
  session_id uuid references public.coach_sessions (id) on delete set null,
  model text not null,
  status text not null check (status in ('ok', 'refusal', 'max_tokens', 'error')),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cost_usd numeric(12, 6) not null default 0
);

create index if not exists coach_usage_created on public.coach_usage (created_at desc);

alter table public.coach_usage enable row level security;
revoke all on public.coach_usage from anon, authenticated;
grant all on public.coach_usage to service_role;
