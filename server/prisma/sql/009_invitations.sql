begin;
create table public.invitations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 email_normalized varchar(320) not null,
 invited_by uuid not null references public.users(id),
 expires_at timestamptz not null,
 accepted_auth_user_id uuid,
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 constraint invitations_normalized_email_check check (email_normalized = lower(trim(email_normalized)) and email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 constraint invitations_acceptance_check check ((accepted_auth_user_id is null) = (accepted_at is null)),
 constraint invitations_revoke_accept_check check (revoked_at is null or accepted_at is null)
);
create index invitations_org_email_idx on public.invitations(organization_id,email_normalized);
create index invitations_org_created_idx on public.invitations(organization_id,created_at);
create unique index invitations_one_pending_email on public.invitations(organization_id,email_normalized) where accepted_at is null and revoked_at is null;
alter table public.invitations enable row level security;
insert into public.schema_migrations(version,name) values ('009','invitations') on conflict(version) do nothing;
commit;
