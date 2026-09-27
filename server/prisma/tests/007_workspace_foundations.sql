-- Integration test for a DISPOSABLE PostgreSQL database only.
-- Creates minimal pre-007 tables, applies the real migration twice, and asserts
-- preservation, defaults, uniqueness, and role/status constraints.
\set ON_ERROR_STOP on
create table public.users (id uuid primary key, github_id integer not null unique);
create table public.organization_members (id uuid primary key, user_id uuid, org_id uuid);
create table public.team_memberships (id uuid primary key, user_id uuid unique, repo_id uuid);
insert into public.users values ('00000000-0000-0000-0000-000000000001', 101);
insert into public.organization_members values (
  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');
insert into public.team_memberships values (
  '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005');
\ir ../sql/000_schema_migrations.sql
\ir ../sql/007_workspace_foundations.sql

do $$ begin
  if not exists (select 1 from public.users where id = '00000000-0000-0000-0000-000000000001' and github_id = 101 and auth_user_id is null) then
    raise exception 'Existing user identity changed';
  end if;
  if not exists (select 1 from public.organization_members where role = 'member' and status = 'active') then
    raise exception 'Unsafe organization defaults';
  end if;
  if not exists (select 1 from public.team_memberships where role = 'developer') then
    raise exception 'Unexpected team default';
  end if;
end $$;

update public.organization_members set role = 'admin', status = 'inactive';
update public.team_memberships set role = 'project_manager';
update public.users set auth_user_id = '00000000-0000-0000-0000-000000000006';
\ir ../sql/007_workspace_foundations.sql

do $$ begin
  if not exists (select 1 from public.organization_members where role = 'admin' and status = 'inactive') then
    raise exception 'Reapplying migration reset organization decisions';
  end if;
  if not exists (select 1 from public.team_memberships where role = 'project_manager') then
    raise exception 'Reapplying migration reset team role';
  end if;
  if not exists (select 1 from public.users where id = '00000000-0000-0000-0000-000000000001' and github_id = 101 and auth_user_id = '00000000-0000-0000-0000-000000000006') then
    raise exception 'Reapplying migration reset identity binding';
  end if;
  if (select count(*) from public.schema_migrations where version = '007') <> 1 then
    raise exception 'Migration ledger is not idempotent';
  end if;
  begin
    update public.organization_members set role = 'owner';
    raise exception 'Invalid organization role accepted';
  exception when check_violation then null; end;
  begin
    update public.organization_members set status = 'invited';
    raise exception 'Invalid organization status accepted';
  exception when check_violation then null; end;
  begin
    update public.team_memberships set role = 'owner';
    raise exception 'Invalid team role accepted';
  exception when check_violation then null; end;
  begin
    insert into public.users values ('00000000-0000-0000-0000-000000000007', 102, '00000000-0000-0000-0000-000000000006');
    raise exception 'Duplicate authentication binding accepted';
  exception when unique_violation then null; end;
  begin
    insert into public.users values ('00000000-0000-0000-0000-000000000008', 101, null);
    raise exception 'Duplicate GitHub identity accepted';
  exception when unique_violation then null; end;
end $$;

-- Email-only identities can exist without sharing a GitHub identity.
insert into public.users values
  ('00000000-0000-0000-0000-000000000009', null, null),
  ('00000000-0000-0000-0000-000000000010', null, null);
select 'workspace foundation migration checks passed' as result;
