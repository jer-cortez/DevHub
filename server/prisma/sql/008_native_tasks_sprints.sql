begin;
create table public.sprints (
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references public.repositories(id),
 name varchar not null, status varchar not null default 'planned',
 created_by uuid not null references public.users(id), created_at timestamptz not null default now(),
 started_at timestamptz, closed_at timestamptz,
 constraint sprints_status_check check (status in ('planned','active','closed')),
 constraint sprints_name_check check (length(trim(name)) between 1 and 200),
 unique (id, repo_id)
);
create unique index sprints_one_active_repo on public.sprints(repo_id) where status = 'active';
create index sprints_repo_status_idx on public.sprints(repo_id,status);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), repo_id uuid not null references public.repositories(id),
 sprint_id uuid, title varchar not null, description text, category varchar not null,
 status varchar not null default 'backlog', assignee_id uuid references public.users(id),
 created_by uuid not null references public.users(id), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), version integer not null default 0,
 constraint tasks_title_check check (length(trim(title)) between 1 and 300),
 constraint tasks_category_check check (category in ('developer','designer','general')),
 constraint tasks_status_check check (status in ('backlog','todo','in_progress','in_review','done')),
 constraint tasks_sprint_status_check check (status = 'backlog' or sprint_id is not null),
 constraint tasks_sprint_repo_fk foreign key (sprint_id,repo_id) references public.sprints(id,repo_id),
 unique (id,repo_id)
);
create index tasks_repo_status_idx on public.tasks(repo_id,status);
create index tasks_sprint_idx on public.tasks(sprint_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create table public.task_comments (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.tasks(id) on delete cascade,
 author_id uuid not null references public.users(id), body text not null,
 created_at timestamptz not null default now(), constraint task_comments_body_check check (length(trim(body)) between 1 and 10000)
);
create index task_comments_task_created_idx on public.task_comments(task_id,created_at);
create unique index pull_request_id_repo_unique on public.pull_request(id,repo_id);
create table public.task_pr_links (
 id uuid primary key default gen_random_uuid(), task_id uuid not null, repo_id uuid not null,
 pr_id uuid not null, created_by uuid not null references public.users(id),
 created_at timestamptz not null default now(),
 constraint task_pr_links_task_repo_fk foreign key (task_id,repo_id) references public.tasks(id,repo_id) on delete cascade,
 constraint task_pr_links_pr_repo_fk foreign key (pr_id,repo_id) references public.pull_request(id,repo_id),
 unique (task_id,pr_id)
);
create index task_pr_links_pr_idx on public.task_pr_links(pr_id);
alter table public.sprints enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_pr_links enable row level security;
-- No client policies: the authenticated server performs workspace authorization.
insert into public.schema_migrations(version,name) values ('008','native_tasks_sprints') on conflict(version) do nothing;
commit;
