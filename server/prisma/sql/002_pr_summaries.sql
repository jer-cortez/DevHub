-- AI-generated pull request summaries.
--
-- ALREADY APPLIED to the Supabase database. Follows 001's convention: DDL
-- applied manually, recorded here so the schema history isn't invisible.
-- Re-running it is safe: every statement is idempotent.

begin;

-- ---------------------------------------------------------------------------
-- pull_request: head SHA + generated summary.
--
-- head_sha is what makes the summary cache correct. A summary is valid iff
-- summary_sha = head_sha, so new commits invalidate it on their own without
-- any explicit cache-busting — a force-push changes the SHA the same way a
-- normal push does. It's populated from pr.head.sha during the existing
-- GitHub sync, so it costs no extra API call.
--
-- summary_model records which model wrote each summary, so that switching
-- models later leaves a way to find and backfill the old ones.
-- ---------------------------------------------------------------------------
-- summary_truncated records that the model only saw part of the diff. A
-- reviewer trusting a confident summary of a 60-file PR that was built from
-- 20 files is the main way this feature misleads people, so it's surfaced in
-- the UI rather than kept as an internal detail.
alter table public.pull_request
  add column if not exists head_sha          varchar,
  add column if not exists summary           text,
  add column if not exists summary_impact    text,
  add column if not exists summary_sha       varchar,
  add column if not exists summary_model     varchar,
  add column if not exists summary_truncated boolean not null default false,
  add column if not exists summarized_at     timestamp;

-- Partial index over just the stale rows, so "which PRs in this repo still
-- need summarizing" stays cheap once a repo accumulates thousands of PRs —
-- the index only contains the rows that answer the question.
create index if not exists pull_request_summary_stale_idx
  on public.pull_request (repo_id)
  where summary_sha is null or summary_sha is distinct from head_sha;

insert into public.schema_migrations (version, name) values ('002', 'pr_summaries')
  on conflict (version) do nothing;

commit;
