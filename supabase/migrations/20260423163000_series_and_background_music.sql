create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  default_creative_controls jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists series_user_id_idx on public.series (user_id);
create index if not exists series_created_at_idx on public.series (created_at desc);

alter table public.series enable row level security;

drop policy if exists "series_select_own" on public.series;
create policy "series_select_own"
  on public.series for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "series_insert_own" on public.series;
create policy "series_insert_own"
  on public.series for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "series_update_own" on public.series;
create policy "series_update_own"
  on public.series for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "series_delete_own" on public.series;
create policy "series_delete_own"
  on public.series for delete
  to authenticated
  using (user_id = auth.uid());

drop trigger if exists set_series_updated_at on public.series;
create trigger set_series_updated_at
  before update on public.series
  for each row execute function public.set_updated_at();

alter table public.projects
  add column if not exists series_id uuid references public.series (id) on delete set null;

create index if not exists projects_series_id_idx on public.projects (series_id);
