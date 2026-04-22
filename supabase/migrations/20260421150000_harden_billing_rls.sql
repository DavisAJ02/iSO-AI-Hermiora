-- Phase 1 billing hardening.
-- Billing and entitlement state must be written only by trusted server code using
-- the service-role key. Users can still read their own billing rows.

-- Profile updates are allowed only for user-editable profile fields.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from anon, authenticated;
grant update (name, avatar_url, onboarding_completed) on public.profiles to authenticated;

-- Subscriptions are entitlement records. Do not let browser clients create,
-- mutate, or delete them directly.
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "subscriptions_delete_own" on public.subscriptions;

revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Payments are a server-owned ledger. Browser clients may read their own rows
-- through RLS, but all inserts and state changes must happen in route handlers,
-- webhooks, or workers using the service role.
drop policy if exists "payments_insert_own" on public.payments;
drop policy if exists "payments_update_own" on public.payments;

revoke insert, update, delete on public.payments from anon, authenticated;

-- Webhook/event audit logs are server-owned.
revoke select, insert, update, delete on public.payment_events from anon, authenticated;

comment on table public.subscriptions is
  'Subscription entitlement records. Writes are service-role only.';

comment on table public.payments is
  'Payment ledger. Writes and state transitions are service-role only.';
