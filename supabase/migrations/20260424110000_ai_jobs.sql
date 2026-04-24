create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  job_type text not null check (job_type in ('script', 'viral_score', 'image', 'video')),
  prompt text not null,
  provider_used text check (provider_used in ('openai', 'replicate', 'runway', 'huggingface')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  output_url text,
  output_text text,
  error_message text,
  cost_estimate numeric(12, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_jobs_user_id_idx on public.ai_jobs (user_id);
create index if not exists ai_jobs_job_type_idx on public.ai_jobs (job_type);
create index if not exists ai_jobs_status_idx on public.ai_jobs (status);
create index if not exists ai_jobs_created_at_idx on public.ai_jobs (created_at desc);

alter table public.ai_jobs enable row level security;

drop policy if exists "ai_jobs_select_own" on public.ai_jobs;
create policy "ai_jobs_select_own"
  on public.ai_jobs for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "ai_jobs_insert_own" on public.ai_jobs;
create policy "ai_jobs_insert_own"
  on public.ai_jobs for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "ai_jobs_update_own" on public.ai_jobs;
create policy "ai_jobs_update_own"
  on public.ai_jobs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop trigger if exists set_ai_jobs_updated_at on public.ai_jobs;
create trigger set_ai_jobs_updated_at
  before update on public.ai_jobs
  for each row execute function public.set_updated_at();
