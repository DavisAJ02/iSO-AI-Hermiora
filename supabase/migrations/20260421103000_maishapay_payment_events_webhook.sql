-- MaishaPay webhook ledger + schema alignment (payment_events, INITIATED, hosted_url, provider maishapay).

-- -----------------------------------------------------------------------------
-- payment_events — immutable notification log (service-role inserts from webhook)
-- -----------------------------------------------------------------------------
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid (),
  payment_id uuid not null references public.payments (id) on delete cascade,
  provider text not null default 'maishapay',
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now ()
);

create index if not exists payment_events_payment_id_idx on public.payment_events (payment_id);
create index if not exists payment_events_created_at_idx on public.payment_events (created_at desc);

comment on table public.payment_events is 'MaishaPay / PSP notifications (audit). Inserted server-side only.';

alter table public.payment_events enable row level security;

-- -----------------------------------------------------------------------------
-- payments — hosted checkout launch URL + INITIATED state + maishapay provider
-- -----------------------------------------------------------------------------
alter table public.payments add column if not exists hosted_url text;

alter table public.payments drop constraint if exists payments_provider_check;

alter table public.payments
  add constraint payments_provider_check
  check (
    provider in ('apple', 'mobile_money', 'maisha', 'maishapay')
  );

alter table public.payments drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status in ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')
  );

-- -----------------------------------------------------------------------------
-- subscriptions — allow "expired" terminal state (optional reporting)
-- -----------------------------------------------------------------------------
alter table public.subscriptions drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (
    status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'expired')
  );

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;

alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (
    provider in ('apple', 'mobile_money', 'maisha', 'maishapay')
  );
