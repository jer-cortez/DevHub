-- Cross-repo expertise index: who has actually touched code like this.
--
-- ALREADY APPLIED to the Supabase database. Follows 001's convention: DDL
-- applied manually, recorded here. Re-running it is safe: every statement is
-- idempotent.
--
-- The point of the feature is finding a reviewer who has worked on *this kind
-- of code* anywhere in the org — someone who refactored auth in three other
-- projects is the right reviewer for an auth PR even if they've never opened
-- this repo. That means the index has to be keyed on something that matches
-- across repos, which exact file paths do not: payments-service/src/auth/ and
-- shared-utils/lib/authentication/ have no path in common. The `segments`
-- array below holds the normalized tokens those paths reduce to, which is
-- what actually matches.

begin;

-- ---------------------------------------------------------------------------
-- file_touches: one row per (person, file, pull request).
--
-- `role` distinguishes writing the code from reviewing it. Both are real
-- signal but they aren't equal, so they're stored separately and weighted at
-- query time rather than collapsed here.
-- ---------------------------------------------------------------------------
create table if not exists public.file_touches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  repo_id    uuid not null references public.repositories(id) on delete cascade,
  pr_id      uuid not null references public.pull_request(id) on delete cascade,
  file_path  text not null,
  -- Normalized tokens from file_path — the cross-repo matching key.
  segments   text[] not null default '{}',
  role       varchar not null check (role in ('author', 'reviewer')),
  -- When the work happened, for recency weighting: expertise goes stale.
  touched_at timestamptz not null
);

-- One row per person per file per PR. Re-running the backfill or re-syncing
-- must not inflate someone's apparent expertise.
create unique index if not exists file_touches_unique_key
  on public.file_touches (pr_id, user_id, file_path, role);

-- The matching query is `segments && $1` — a GIN index is what makes array
-- overlap fast rather than a full scan of every touch in the org.
create index if not exists file_touches_segments_idx
  on public.file_touches using gin (segments);

create index if not exists file_touches_user_idx
  on public.file_touches (user_id, touched_at desc);

-- Lets the backfill skip PRs it has already ingested without a full scan.
create index if not exists file_touches_pr_idx
  on public.file_touches (pr_id);

alter table public.file_touches enable row level security;

-- ---------------------------------------------------------------------------
-- Per-user opt-in for automated suggestions.
--
-- Defaults to true so the feature works out of the box, but anyone can remove
-- themselves — being auto-suggested as a reviewer across every repo in the
-- org is exactly the kind of thing people want a say in.
-- ---------------------------------------------------------------------------
alter table public.users
  add column if not exists allow_review_suggestions boolean not null default true;

insert into public.schema_migrations (version, name) values ('005', 'expertise_index')
  on conflict (version) do nothing;

commit;
