-- Form Coach tables and row-level security.
-- Run once: Supabase dashboard → SQL Editor → paste this file → Run. Safe to re-run.
--
-- Who can do what:
--   signed-out visitors (anon)   nothing
--   signed-in students           read their own rows; manage their own instructor;
--                                add professor feedback to their own sessions
--   the server (secret key)      everything (bypasses RLS): accounts, billing, new sessions

-- ---------- Tables ----------

create table if not exists public.coach_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  trial_used integer not null default 0,
  stripe_customer_id text unique,
  subscription_id text,
  subscription_status text,          -- Stripe status: trialing | active | past_due | canceled | ...
  period_start timestamptz,
  period_end timestamptz,
  period_used integer not null default 0
);

create table if not exists public.coach_instructors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color integer not null default 0 check (color between 0 and 5),
  tone text not null check (tone in ('warm', 'balanced', 'direct')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced', 'preprofessional')),
  focus text[] not null default '{}' check (cardinality(focus) <= 3),
  notes text not null default '' check (char_length(notes) <= 400),
  learn_from_professor boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  piece text,
  goal text,
  duration_sec real not null,
  frame_times jsonb not null default '[]',
  thumbs jsonb not null default '{}',
  loudness jsonb not null default '[]',
  audio jsonb,
  ai jsonb not null,
  overall real,
  instructor_name text not null,
  model text not null,
  professor_name text check (char_length(professor_name) <= 80),
  professor_notes text check (char_length(professor_notes) <= 2000),
  professor_scores jsonb,
  professor_at timestamptz
);

create index if not exists coach_sessions_user_created
  on public.coach_sessions (user_id, created_at desc);

-- ---------- Row-level security ----------

alter table public.coach_accounts enable row level security;
alter table public.coach_instructors enable row level security;
alter table public.coach_sessions enable row level security;

revoke all on public.coach_accounts, public.coach_instructors, public.coach_sessions from anon, authenticated;
grant all on public.coach_accounts, public.coach_instructors, public.coach_sessions to service_role;

-- Accounts: read your own; only the server writes (credits, subscription).
grant select on public.coach_accounts to authenticated;
drop policy if exists "Students read their own account" on public.coach_accounts;
create policy "Students read their own account" on public.coach_accounts
  for select to authenticated using ((select auth.uid()) = user_id);

-- Instructor: fully yours.
grant select, insert, update, delete on public.coach_instructors to authenticated;
drop policy if exists "Students manage their own instructor" on public.coach_instructors;
create policy "Students manage their own instructor" on public.coach_instructors
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sessions: the server creates them; you can read or delete yours,
-- and edit only the professor-feedback columns.
grant select, delete on public.coach_sessions to authenticated;
grant update (professor_name, professor_notes, professor_scores, professor_at)
  on public.coach_sessions to authenticated;
drop policy if exists "Students read their own sessions" on public.coach_sessions;
create policy "Students read their own sessions" on public.coach_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Students add professor feedback" on public.coach_sessions;
create policy "Students add professor feedback" on public.coach_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "Students delete their own sessions" on public.coach_sessions;
create policy "Students delete their own sessions" on public.coach_sessions
  for delete to authenticated using ((select auth.uid()) = user_id);
