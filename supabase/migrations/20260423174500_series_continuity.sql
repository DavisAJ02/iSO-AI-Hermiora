alter table public.series
  add column if not exists continuity_mode boolean not null default false,
  add column if not exists story_bible text;
