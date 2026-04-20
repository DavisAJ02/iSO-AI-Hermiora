# Hermiora AI — Supabase backend setup

This guide matches the migration in `supabase/migrations/20260420120000_hermiora_core.sql`.

## What you get

- **public.users** — one row per `auth.users` row (`id`, `email`, `created_at`), kept in sync by triggers.
- **public.profiles** — app profile, plan, and usage counters (`plan`: `free` \| `creator` \| `pro`).
- **public.projects** — AI video projects (`status`: `draft` \| `generating` \| `ready` \| `failed`).
- **public.generations** — pipeline rows per project (`step`: `hook` \| `script` \| `scenes` \| `voice` \| `render`).
- **public.subscriptions** — billing state (`provider`: `apple` \| `mobile_money`).
- **public.payments** — ledger rows (`provider`: `apple` \| `mobile_money`).
- **Row Level Security (RLS)** — authenticated users only see and change their own rows (projects/generations scoped by `user_id` / project ownership).
- **Storage buckets** — `videos`, `images`, `audio` (private) with policies so each user only reads/writes objects under their own prefix.

## Prerequisites

- A [Supabase](https://supabase.com) project (free tier is fine).
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) for local workflow.

## 1. Apply the SQL schema

### Option A — SQL Editor (fastest)

1. Open the Supabase dashboard → **SQL** → **New query**.
2. Paste the full contents of `supabase/migrations/20260420120000_hermiora_core.sql`.
3. Run it once. Fix any error about existing policies/triggers by re-running after adjusting names (the migration uses `drop policy if exists` / `drop trigger if exists` where needed).

### Option B — Supabase CLI

From the `hermiora` app folder (where `supabase/` lives):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

If you do not use migrations yet, you can instead run:

```bash
supabase db execute --file supabase/migrations/20260420120000_hermiora_core.sql
```

(Exact CLI flags can vary by CLI version; the SQL Editor path always works.)

## 2. Auth → `public.users` + `public.profiles`

On **new** `auth.users` inserts, the migration creates:

- a row in `public.users` (`id`, `email`, `created_at`),
- a row in `public.profiles` with defaults (`plan = 'free'`, `usage_limit = 5`, `monthly_usage_count = 0`).

Email changes on `auth.users` update `public.users.email`.

### Backfill existing users (optional)

If you already have accounts before running the migration, run once in SQL Editor:

```sql
insert into public.users (id, email, created_at)
select id, email, coalesce(created_at, now()) from auth.users
on conflict (id) do update set email = excluded.email;

insert into public.profiles (id, name, avatar_url, plan, monthly_usage_count, usage_limit, created_at)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url',
  'free',
  0,
  5,
  now()
from auth.users u
on conflict (id) do nothing;
```

## 3. Row Level Security (summary)

| Table            | Rule |
|-----------------|------|
| `public.users`  | `select` own row only (`id = auth.uid()`). No client `update` (email synced from auth). |
| `public.profiles` | `select` / `update` own row (`id = auth.uid()`). No client `insert` / `delete` (created with auth). |
| `public.projects` | full CRUD where `user_id = auth.uid()`. |
| `public.generations` | full CRUD when linked `project_id` belongs to the user. |
| `public.subscriptions` | full CRUD where `user_id = auth.uid()`. |
| `public.payments` | `select` / `insert` / `update` where `user_id = auth.uid()`. |

**Production hardening:** prefer writing `subscriptions` and `payments` from **Edge Functions** or your **Next.js server** using the **service role** key, then **remove** client `insert`/`update` policies and keep `select` only. The migration is permissive so you can iterate quickly in development.

## 4. Storage buckets & path convention

Buckets created: **`videos`**, **`images`**, **`audio`** (all **private**).

Policies require object keys like:

```text
{auth_uid}/{filename}
```

Example: `9b2c…/renders/clip-001.mp4` — the **first path segment must equal** `auth.uid()`.

In the JS client:

```ts
const path = `${session.user.id}/${crypto.randomUUID()}.mp4`;
await supabase.storage.from('videos').upload(path, file, { upsert: false });
```

Signed URLs for playback:

```ts
const { data, error } = await supabase.storage
  .from('videos')
  .createSignedUrl(path, 3600);
```

## 5. Next.js / app environment

Copy `.env.example` to `.env.local` and fill values (never commit `.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Server-only (webhooks, admin jobs):

```env
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Use the **anon** key in the browser; use the **service role** only on the server.

### App helpers (already in repo)

- `src/utils/supabase/client.ts` — `createClient()` for Client Components.
- `src/utils/supabase/server.ts` — `createClient(await cookies())` for Server Components / Route Handlers / Server Actions.
- `src/utils/supabase/middleware.ts` — `updateSession()`; wired from root `src/middleware.ts`.
- `src/lib/supabase/admin.ts` — `createAdminSupabaseClient()` (service role, server-only).

## 6. Quick verification checklist

1. **Sign up** a test user → confirm rows in `public.users` and `public.profiles`.
2. **Insert** a `projects` row with `user_id = auth.uid()` from the app → succeeds; try another user’s UUID → fails (RLS).
3. **Upload** to `videos` under your UID prefix → succeeds; upload without UID prefix → fails.

## Schema reference (columns)

**public.users** — `id` (PK, FK `auth.users`), `email`, `created_at`.

**public.profiles** — `id` (PK, FK `auth.users`), `name`, `avatar_url`, `plan`, `monthly_usage_count`, `usage_limit`, `created_at`, `updated_at`.

**public.projects** — `id`, `user_id`, `title`, `idea`, `status`, `progress`, `video_url`, `created_at`, `updated_at`.

**public.generations** — `id`, `project_id`, `step`, `status`, `output` (jsonb), `created_at`, `updated_at`.

**public.subscriptions** — `id`, `user_id`, `plan`, `status`, `expires_at`, `provider`, `created_at`, `updated_at`.

**public.payments** — `id`, `user_id`, `amount`, `currency`, `provider`, `status`, `reference`, `created_at`.

---

If you want `published` as a project state for the marketing UI, add it with a follow-up migration (`alter table ... drop constraint` / new `check`) and adjust RLS only if new rules are needed.
