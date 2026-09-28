-- Disposable PostgreSQL only, after migration 009. Fixture rows are rolled back.
begin;
do $$
declare
  member_id uuid := gen_random_uuid();
  org_id uuid := gen_random_uuid();
  invite_id uuid := gen_random_uuid();
  failures integer := 0;
begin
  insert into public.users(id,username) values(member_id,'invitation-fixture');
  insert into public.organizations(id,github_org_id,name,avatar_url,created_at)
    values(org_id,-900009001,'invitation-fixture','',now());
  insert into public.invitations(id,organization_id,email_normalized,invited_by,expires_at)
    values(invite_id,org_id,'member@example.org',member_id,now()+interval '7 days');
  begin
    insert into public.invitations(organization_id,email_normalized,invited_by,expires_at)
      values(org_id,'member@example.org',member_id,now()+interval '7 days');
  exception when unique_violation then failures := failures+1; end;
  begin
    insert into public.invitations(organization_id,email_normalized,invited_by,expires_at)
      values(org_id,'Upper@Example.org',member_id,now()+interval '7 days');
  exception when check_violation then failures := failures+1; end;
  begin
    update public.invitations set accepted_at=now() where id=invite_id;
  exception when check_violation then failures := failures+1; end;
  update public.invitations set accepted_at=now(),accepted_auth_user_id=gen_random_uuid() where id=invite_id;
  begin
    update public.invitations set revoked_at=now() where id=invite_id;
  exception when check_violation then failures := failures+1; end;
  if failures <> 4 then raise exception 'Invitation constraints failed: % of 4',failures; end if;
  if not exists(select 1 from pg_class where oid='public.invitations'::regclass and relrowsecurity) then
    raise exception 'Invitation RLS missing';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='invitations') then
    raise exception 'Unexpected invitation client policy';
  end if;
end $$;
rollback;
