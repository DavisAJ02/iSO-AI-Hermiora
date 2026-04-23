alter table public.projects
  add column if not exists creative_controls jsonb;

comment on column public.projects.creative_controls is 'User-selected creative generation controls such as niche, language, style, captions, effects, and example script.';
