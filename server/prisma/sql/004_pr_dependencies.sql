-- Cross-repo pull request dependencies: "PR #142 in payments-service can't
-- merge until PR #89 in shared-utils merges first".
--
-- ALREADY APPLIED to the Supabase database. Follows 001's convention: DDL
-- applied manually, recorded here. Re-running it is safe: every statement is
-- idempotent.
--
-- Advisory only by design. Nothing here can stop a merge on GitHub — that
-- would require posting a check run against the PR's head SHA, which needs
-- Checks:write on the token plus branch protection configured to require it.
-- This models and surfaces the relationship; enforcement is a later step.

begin;

-- ---------------------------------------------------------------------------
-- pr_dependencies: a directed edge, blocked -> blocking.
--
-- Both sides are plain pull_request ids, so a dependency crosses repos for
-- free — the repo is whatever each PR belongs to. There's no repo column
-- here on purpose: duplicating it would let it disagree with the PR row.
-- ---------------------------------------------------------------------------
create table if not exists public.pr_dependencies (
  id             uuid primary key default gen_random_uuid(),
  blocked_pr_id  uuid not null references public.pull_request(id) on delete cascade,
  blocking_pr_id uuid not null references public.pull_request(id) on delete cascade,
  -- Free-text rationale so a reviewer understands *why* without asking.
  note           text,
  created_by     uuid not null references public.users(id),
  created_at     timestamptz not null default now(),

  -- A PR cannot block itself. Longer cycles (A->B->A) can't be expressed as a
  -- table constraint and are rejected in the service layer by walking the
  -- graph before insert.
  constraint pr_dependencies_no_self_block check (blocked_pr_id <> blocking_pr_id)
);

-- One edge per pair, so linking twice updates rather than duplicates.
create unique index if not exists pr_dependencies_pair_key
  on public.pr_dependencies (blocked_pr_id, blocking_pr_id);

-- Both directions are queried on every PR list: "what blocks this PR" and
-- "what am I blocking" (the latter matters when deciding what to merge next).
create index if not exists pr_dependencies_blocked_idx
  on public.pr_dependencies (blocked_pr_id);
create index if not exists pr_dependencies_blocking_idx
  on public.pr_dependencies (blocking_pr_id);

-- Matches every other table in this schema; the server connects as the table
-- owner over a direct Postgres connection and so bypasses RLS. This only
-- keeps Supabase's auto-generated REST API from exposing the table.
alter table public.pr_dependencies enable row level security;

commit;
