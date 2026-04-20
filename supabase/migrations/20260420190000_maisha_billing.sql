-- MaishaPay billing: payments / subscriptions schema for hosted checkout + entitlements.

-- -----------------------------------------------------------------------------
-- payments: status model (PENDING | SUCCESS | FAILED | EXPIRED), Maisha fields
-- -----------------------------------------------------------------------------
alter table public.payments add column if not exists subscription_id uuid references public.subscriptions (id) on delete set null;
alter table public.payments add column if not exists external_reference text;
alter table public.payments add column if not exists plan text;
alter table public.payments add column if not exists method text;
alter table public.payments add column if not exists operator text;
alter table public.payments add column if not exists operator_reference text;
alter table public.payments add column if not exists payer_phone text;
alter table public.payments add column if not exists payer_email text;
alter table public.payments add column if not exists payer_name text;
alter table public.payments add column if not exists billing_period text;
alter table public.payments add column if not exists gateway_response jsonb not null default '{}'::jsonb;
alter table public.payments add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Migrate legacy status values to new uppercase set
update public.payments
set status = case lower(status)
  when 'pending' then 'PENDING'
  when 'succeeded' then 'SUCCESS'
  when 'failed' then 'FAILED'
  when 'refunded' then 'EXPIRED'
  else status
end
where status is not null
  and status in ('pending', 'succeeded', 'failed', 'refunded');

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED'));

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check
  check (provider in ('apple', 'mobile_money', 'maisha'));

-- method: how user paid within a provider (Maisha: mobile_money | card; Apple: apple)
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments
  add constraint payments_method_check
  check (
    method is null
    or method in ('apple', 'mobile_money', 'card')
  );

update public.payments
set method = case provider
  when 'apple' then 'apple'
  when 'mobile_money' then 'mobile_money'
  else method
end
where method is null;

alter table public.payments drop constraint if exists payments_plan_check;
alter table public.payments
  add constraint payments_plan_check
  check (plan is null or plan in ('creator', 'pro'));

alter table public.payments drop constraint if exists payments_billing_period_check;
alter table public.payments
  add constraint payments_billing_period_check
  check (
    billing_period is null
    or billing_period in ('monthly', 'yearly')
  );

create unique index if not exists payments_reference_unique
  on public.payments (reference)
  where reference is not null;

alter table public.payments alter column status set default 'PENDING';

-- -----------------------------------------------------------------------------
-- subscriptions: starts_at + maisha provider
-- -----------------------------------------------------------------------------
alter table public.subscriptions add column if not exists starts_at timestamptz;

update public.subscriptions
set starts_at = coalesce(starts_at, created_at)
where starts_at is null;

alter table public.subscriptions drop constraint if exists subscriptions_provider_check;
alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('apple', 'mobile_money', 'maisha'));
