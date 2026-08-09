-- Teams, repo following, and personalized notifications.
--
-- ALREADY APPLIED to the Supabase database. This project has no
-- prisma/migrations directory — schema.prisma is introspected via
-- `prisma db pull` — so this file exists as the written record of DDL that
-- was applied manually, to keep the schema history from being invisible.
-- Re-running it is safe: every statement is idempotent.
--
-- RLS is enabled on the new tables to match every existing table here. The
-- server connects as the table owner over a direct Postgres connection,
-- which bypasses RLS, so this doesn't affect Prisma access — it only keeps
-- Supabase's auto-generated REST API from exposing these tables.

begin;

-- ---------------------------------------------------------------------------
-- team_memberships: which repo (project) each person is currently working on.
-- ---------------------------------------------------------------------------
create table if not exists public.team_memberships (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid        not null,
  repo_id   uuid        not null,
  joined_at timestamptz not null default now(),
  -- One team at a time: switching repos is an upsert on user_id, so the
  -- uniqueness is on user_id alone, not the (user_id, repo_id) pair.
  constraint team_memberships_user_id_key unique (user_id)
);
create index if not exists team_memberships_repo_id_idx
  on public.team_memberships (repo_id);
alter table public.team_memberships enable row level security;

-- ---------------------------------------------------------------------------
-- issues: mirrors the shape of the existing pull_request table.
-- ---------------------------------------------------------------------------
create table if not exists public.issues (
  id                  uuid primary key default gen_random_uuid(),
  github_issue_id     bigint    not null,
  github_issue_number integer   not null,
  repo_id             uuid      not null,
  author_id           uuid      not null,
  assignee_id         uuid,
  title               varchar   not null,
  body                text,
  status              varchar   not null default 'open',
  github_url          varchar   not null,
  last_synced_at      timestamp,
  created_at          timestamp not null default now(),
  closed_at           timestamp,
  constraint issues_github_issue_id_key unique (github_issue_id)
);
create index if not exists issues_repo_id_idx on public.issues (repo_id);
alter table public.issues enable row level security;

-- ---------------------------------------------------------------------------
-- notifications: was unwritable — pr_id and board_id were both NOT NULL, so
-- no row could satisfy both a PR notification and a board notification.
-- ---------------------------------------------------------------------------
alter table public.notifications
  alter column pr_id    drop not null,
  alter column board_id drop not null,
  alter column is_read  set default false,
  add column if not exists issue_id   uuid,
  add column if not exists comment_id uuid,
  add column if not exists repo_id    uuid,
  add column if not exists actor_id   uuid,
  add column if not exists is_direct  boolean not null default false,
  -- title/url are deliberately denormalized: this schema has no Prisma
  -- @relation attributes anywhere, so rendering a notification otherwise
  -- costs a hand-written four-way join per row.
  add column if not exists title      varchar,
  add column if not exists url        varchar;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read);

-- ---------------------------------------------------------------------------
-- repo_followers: add per-event-type delivery preferences.
-- ---------------------------------------------------------------------------
alter table public.repo_followers
  add column if not exists notify_pull_requests boolean not null default true,
  add column if not exists notify_issues        boolean not null default false,
  add column if not exists notify_comments      boolean not null default false;

alter table public.repo_followers
  drop constraint if exists repo_followers_user_repo_key;
alter table public.repo_followers
  add constraint repo_followers_user_repo_key unique (user_id, repo_id);

-- ---------------------------------------------------------------------------
-- review_comments: carry issue comments too, rather than adding a parallel
-- table. Exactly one of pr_id / issue_id is set.
-- ---------------------------------------------------------------------------
alter table public.review_comments
  alter column pr_id drop not null,
  add column if not exists issue_id uuid;

create index if not exists review_comments_issue_id_idx
  on public.review_comments (issue_id);

alter table public.review_comments
  drop constraint if exists review_comments_pr_xor_issue;
alter table public.review_comments
  add constraint review_comments_pr_xor_issue
  check ((pr_id is null) <> (issue_id is null));

commit;
