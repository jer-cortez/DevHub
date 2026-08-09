-- Org health dashboard: review-data ingestion constraints + query indexes.
--
-- ALREADY APPLIED to the Supabase database. Follows 001's convention: DDL
-- applied manually, recorded here. Re-running it is safe: every statement is
-- idempotent.
--
-- Context: pull_request_reviewers and reviews existed but were never
-- populated from GitHub — only by the manual create endpoints — so both were
-- empty. The dashboard's "who has too many pending reviews" question needs
-- them synced, and syncing needs conflict targets to upsert onto. That's
-- what the unique constraints below are for.

begin;

-- ---------------------------------------------------------------------------
-- Upsert keys for the new GitHub ingestion.
-- ---------------------------------------------------------------------------

-- A person is requested on a PR at most once, so (pr_id, user_id) is the
-- natural key. Duplicates are removed first, because a unique index can't be
-- created over existing violations — both tables are empty today, but this
-- keeps the file re-runnable against a database that has drifted.
delete from public.pull_request_reviewers a
  using public.pull_request_reviewers b
  where a.ctid < b.ctid and a.pr_id = b.pr_id and a.user_id = b.user_id;

create unique index if not exists pull_request_reviewers_pr_user_key
  on public.pull_request_reviewers (pr_id, user_id);

-- GitHub's review id is globally unique; ours wasn't constrained, so a second
-- sync would have inserted every review again.
delete from public.reviews a
  using public.reviews b
  where a.ctid < b.ctid and a.github_review_id = b.github_review_id;

create unique index if not exists reviews_github_review_id_key
  on public.reviews (github_review_id);

-- ---------------------------------------------------------------------------
-- Indexes for the dashboard's aggregate queries.
--
-- Every dashboard section filters open PRs or walks activity per PR, and all
-- of them run on one page load, so these are the difference between a fast
-- page and four sequential seq scans once the org has real volume.
-- ---------------------------------------------------------------------------
create index if not exists pull_request_status_repo_idx
  on public.pull_request (status, repo_id);

create index if not exists pull_request_reviewers_user_status_idx
  on public.pull_request_reviewers (user_id, status);

create index if not exists reviews_pr_submitted_idx
  on public.reviews (pr_id, submitted_at desc);

create index if not exists review_comments_pr_created_idx
  on public.review_comments (pr_id, created_at desc);

insert into public.schema_migrations (version, name) values ('003', 'org_health')
  on conflict (version) do nothing;

commit;
