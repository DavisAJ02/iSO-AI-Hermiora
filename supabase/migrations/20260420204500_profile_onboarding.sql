-- Optional onboarding flag (defaults false for new users via trigger insert)
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

comment on column public.profiles.onboarding_completed is 'App onboarding checklist; distinct from auth.';
