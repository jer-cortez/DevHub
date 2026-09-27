-- Workspace identity and membership foundations.
--
-- Apply this migration before deploying a regenerated Prisma client: queries
-- that select the new fields require these columns to exist. Existing rows
-- receive membership defaults; this migration does not map auth users or
-- promote anyone to admin.

begin;

-- Preserve existing GitHub identities while allowing accounts that use
-- Supabase auth to have no GitHub identity. auth_user_id is an explicit,
-- nullable mapping; it is not backfilled from email or username and has no
-- foreign key dependency on the external auth.users table.
alter table public.users
  alter column github_id drop not null,
  add column if not exists auth_user_id uuid;

create unique index if not exists users_auth_user_id_key
  on public.users (auth_user_id);

-- Existing organization memberships receive the least-privileged defaults.
alter table public.organization_members
  add column if not exists role varchar not null default 'member',
  add column if not exists status varchar not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_role_check'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_role_check
      check (role in ('member', 'admin'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_status_check'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_status_check
      check (status in ('active', 'inactive'));
  end if;
end;
$$;

-- Existing team memberships receive the default developer role.
alter table public.team_memberships
  add column if not exists role varchar not null default 'developer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_memberships_role_check'
      and conrelid = 'public.team_memberships'::regclass
  ) then
    alter table public.team_memberships
      add constraint team_memberships_role_check
      check (role in ('developer', 'designer', 'tech_lead', 'project_manager'));
  end if;
end;
$$;

insert into public.schema_migrations (version, name)
values ('007', 'workspace_foundations')
on conflict (version) do nothing;

commit;
