begin;

-- Model checkpoints include repository source and are not a public API.
create schema if not exists audit_private;
revoke all on schema audit_private from public;

create table if not exists public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  pr_id uuid not null references public.pull_request(id) on delete cascade,
  repo_id uuid not null references public.repositories(id) on delete cascade,
  owner text not null,
  repo text not null,
  pr_number integer not null,
  base_sha text not null,
  head_sha text not null,
  merge_base_sha text,
  config_version text not null,
  profile jsonb not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled', 'superseded')),
  stage text not null default 'queued',
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  cancel_requested boolean not null default false,
  result jsonb not null default '{}'::jsonb,
  usage jsonb not null default '{}'::jsonb,
  error text,
  publication_state text not null default 'none'
    check (publication_state in ('none', 'pending', 'published', 'uncertain')),
  github_review_id bigint,
  github_review_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique (pr_id, base_sha, head_sha, config_version)
);

create index if not exists audit_runs_queue_idx
  on public.audit_runs (status, lease_until, created_at);
create index if not exists audit_runs_pr_created_idx
  on public.audit_runs (pr_id, created_at desc);

create table if not exists public.audit_control (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  publish_enabled boolean not null default false
);
insert into public.audit_control (id) values (true) on conflict (id) do nothing;

create table if not exists public.audit_feedback (
  run_id uuid not null references public.audit_runs(id) on delete cascade,
  finding_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  verdict text not null check (verdict in ('useful', 'incorrect')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (run_id, finding_id, user_id)
);

create table if not exists public.audit_webhook_deliveries (
  delivery_id text primary key,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.audit_webhook_deliveries
  add column if not exists processed boolean not null default false;

alter table public.audit_runs enable row level security;
alter table public.audit_control enable row level security;
alter table public.audit_feedback enable row level security;
alter table public.audit_webhook_deliveries enable row level security;

insert into public.schema_migrations (version, name) values ('006', 'agent_audits')
  on conflict (version) do nothing;

commit;
