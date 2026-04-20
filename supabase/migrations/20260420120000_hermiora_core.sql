-- Hermiora AI — core schema, RLS, storage (Supabase / PostgreSQL)
-- Run via Supabase CLI (`supabase db push`) or SQL Editor in the dashboard.

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Types (CHECK constraints; easy to evolve without enum migrations)
-- -----------------------------------------------------------------------------
-- plan_tier: free | creator | pro
-- project_status: draft | generating | ready | failed
-- generation_step: hook | script | scenes | voice | render
-- job_status: pending | processing | done | failed
-- subscription_status: active | canceled | past_due | trialing | incomplete
-- payment_status: pending | succeeded | failed | refunded

-- -----------------------------------------------------------------------------
-- public.users — mirror auth identity for FKs & public joins (1:1 auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

comment on table public.users is 'Application user row; kept in sync with auth.users.';

-- -----------------------------------------------------------------------------
-- public.profiles — app profile & plan / usage (1:1 auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  plan text not null default 'free'
    check (plan in ('free', 'creator', 'pro')),
  monthly_usage_count integer not null default 0 check (monthly_usage_count >= 0),
  usage_limit integer not null default 5 check (usage_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User-facing profile and subscription tier snapshot.';

-- -----------------------------------------------------------------------------
-- public.projects
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null default '',
  idea text,
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'ready', 'failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  video_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_status_idx on public.projects (status);

-- -----------------------------------------------------------------------------
-- public.generations — pipeline steps per project
-- -----------------------------------------------------------------------------
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  step text not null
    check (step in ('hook', 'script', 'scenes', 'voice', 'render')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  output jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generations_project_id_idx on public.generations (project_id);
create index if not exists generations_step_idx on public.generations (step);

-- -----------------------------------------------------------------------------
-- public.subscriptions
-- -----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan text not null check (plan in ('free', 'creator', 'pro')),
  status text not null default 'incomplete'
    check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  expires_at timestamptz,
  provider text not null check (provider in ('apple', 'mobile_money')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- -----------------------------------------------------------------------------
-- public.payments
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  provider text not null check (provider in ('apple', 'mobile_money')),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_reference_idx on public.payments (reference);

-- -----------------------------------------------------------------------------
-- Triggers: new auth user → public.users + public.profiles
-- -----------------------------------------------------------------------------
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, created_at)
  values (new.id, new.email, coalesce(new.created_at, now()))
  on conflict (id) do update set email = excluded.email;

  insert into public.profiles (id, name, avatar_url, plan, monthly_usage_count, usage_limit, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'free',
    0,
    5,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();

-- Keep public.users.email in sync when auth email changes
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.users set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.handle_auth_user_updated();

-- -----------------------------------------------------------------------------
-- updated_at helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_generations_updated_at on public.generations;
create trigger set_generations_updated_at
  before update on public.generations
  for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.generations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

-- public.users
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  to authenticated
  using (id = auth.uid());

-- No client UPDATE on public.users — email is synced from auth.users via trigger.

-- public.profiles
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Profiles are created by handle_auth_user_created (security definer). No client INSERT.

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- public.projects
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
  on public.projects for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
  on public.projects for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
  on public.projects for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
  on public.projects for delete
  to authenticated
  using (user_id = auth.uid());

-- public.generations — scoped through project ownership
drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
  on public.generations for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = generations.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own"
  on public.generations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = generations.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "generations_update_own" on public.generations;
create policy "generations_update_own"
  on public.generations for update
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = generations.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = generations.project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own"
  on public.generations for delete
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = generations.project_id and p.user_id = auth.uid()
    )
  );

-- public.subscriptions
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own"
  on public.subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own"
  on public.subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own"
  on public.subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- public.payments
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own"
  on public.payments for insert
  to authenticated
  with check (user_id = auth.uid());

-- Payments are usually finalized by backend webhooks — allow update only for row owner (or use service role in Edge Functions)
drop policy if exists "payments_update_own" on public.payments;
create policy "payments_update_own"
  on public.payments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Storage buckets (private)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('videos', 'videos', false),
  ('images', 'images', false),
  ('audio', 'audio', false)
on conflict (id) do nothing;

-- Path convention: {auth.uid()}/{...filename...}  → first folder must match user id
-- SELECT (read / list)
drop policy if exists "storage_objects_select_own" on storage.objects;
create policy "storage_objects_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('videos', 'images', 'audio')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT (upload)
drop policy if exists "storage_objects_insert_own" on storage.objects;
create policy "storage_objects_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('videos', 'images', 'audio')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE (e.g. metadata)
drop policy if exists "storage_objects_update_own" on storage.objects;
create policy "storage_objects_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('videos', 'images', 'audio')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('videos', 'images', 'audio')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE
drop policy if exists "storage_objects_delete_own" on storage.objects;
create policy "storage_objects_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('videos', 'images', 'audio')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
