-- Applied-migration ledger.
--
-- ALREADY APPLIED to the Supabase database. Numbered 000 because it must run
-- before any other file: every migration from 001 onward ends by recording
-- itself here, and those inserts need this table to exist.
--
-- Why this exists: schema.prisma is introspected from the database, so it
-- describes the current shape but not which DDL produced it — and it can't
-- represent check constraints or row-level security at all (Prisma emits a
-- "requires additional setup" comment for both). That makes prisma/sql the
-- only executable record of this database. Until now, whether a file had
-- been applied was recorded in a hand-edited header comment, which is
-- exactly the sort of thing that goes stale. This makes it a query.
--
-- Re-running is safe: every statement is idempotent.

begin;

create table if not exists public.schema_migrations (
  -- The numeric prefix of the filename: '000', '001', ...
  version    text primary key,
  -- The rest of the filename, for readability in query output.
  name       text not null,
  -- md5 of the file as it was on disk when first seen by the status script.
  -- Populated by `npm run migrate:status`, not by the migration files, since
  -- a file can't read itself. Lets the script flag a migration that was
  -- edited after being applied — the database won't match the file any more.
  checksum   text,
  applied_at timestamptz not null default now()
);

alter table public.schema_migrations enable row level security;

insert into public.schema_migrations (version, name) values ('000', 'schema_migrations')
  on conflict (version) do nothing;

commit;
