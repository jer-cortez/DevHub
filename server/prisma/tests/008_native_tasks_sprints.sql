-- Run only in a disposable database after migration 008. All fixture rows roll back.
begin;
do $$
declare
  fixture_user uuid := gen_random_uuid();
  fixture_org uuid := gen_random_uuid();
  fixture_repo uuid := gen_random_uuid();
  other_repo uuid := gen_random_uuid();
  sprint_id uuid := gen_random_uuid();
  task_id uuid := gen_random_uuid();
  pr_id uuid := gen_random_uuid();
  violations integer := 0;
begin
  insert into public.users(id,username) values (fixture_user,'migration-008-fixture');
  insert into public.organizations(id,github_org_id,name,avatar_url,created_at)
    values (fixture_org, -900008001, 'migration-008-fixture', '', now());
  insert into public.repositories(id,github_repo_id,org_id,name,description,is_private,default_branch,last_synced_at)
    values (fixture_repo,-900008001,fixture_org,'migration-008-fixture','',false,'main',now()),
           (other_repo,-900008002,fixture_org,'migration-008-other','',false,'main',now());
  insert into public.sprints(id,repo_id,name,status,created_by) values (sprint_id,fixture_repo,'active fixture','active',fixture_user);
  begin
    insert into public.sprints(repo_id,name,status,created_by) values (fixture_repo,'second active','active',fixture_user);
  exception when unique_violation then violations := violations + 1; end;
  begin
    insert into public.tasks(repo_id,sprint_id,title,category,status,created_by)
      values (other_repo,sprint_id,'foreign sprint','general','todo',fixture_user);
  exception when foreign_key_violation then violations := violations + 1; end;
  begin
    insert into public.tasks(repo_id,title,category,status,created_by)
      values (fixture_repo,'missing sprint','general','todo',fixture_user);
  exception when check_violation then violations := violations + 1; end;
  begin
    insert into public.tasks(repo_id,title,category,status,created_by)
      values (fixture_repo,'invalid category','other','backlog',fixture_user);
  exception when check_violation then violations := violations + 1; end;
  insert into public.tasks(id,repo_id,title,category,status,created_by)
    values (task_id,fixture_repo,'valid task','general','backlog',fixture_user);
  insert into public.pull_request(id,github_pr_id,github_pr_number,repo_id,author_id,title,status,base_branch,head_branch,github_url)
    values (pr_id,-900008001,1,other_repo,fixture_user,'fixture PR','open','main','feature','https://example.invalid/pr');
  begin
    insert into public.task_pr_links(task_id,repo_id,pr_id,created_by)
      values (task_id,fixture_repo,pr_id,fixture_user);
  exception when foreign_key_violation then violations := violations + 1; end;
  begin
    insert into public.task_comments(task_id,author_id,body) values (task_id,fixture_user,' ');
  exception when check_violation then violations := violations + 1; end;
  if violations <> 6 then raise exception 'Migration 008 constraints failed: % of 6 violations', violations; end if;
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='sprints_one_active_repo') then raise exception 'active sprint index absent'; end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('tasks','task_comments','task_pr_links','sprints') and not c.relrowsecurity) then raise exception 'RLS disabled'; end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename in ('tasks','task_comments','task_pr_links','sprints')) then raise exception 'unexpected client policy'; end if;
end $$;
rollback;
