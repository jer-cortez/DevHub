# DevHub

A platform for cross-team code review on GitHub. The core problem it solves:
the right reviewer for a change is often someone who has never opened that
specific repo — someone who refactored auth in three other projects is a
better reviewer for an auth PR than a teammate picking it up cold. DevHub
surfaces that person, gives them the context to review competently, and
gives leads visibility into where review is actually getting stuck across
every repo, not just the one they happen to be watching.

## What it does

- **Cross-repo reviewer suggestions** — matches reviewers to a PR by what
  they've actually worked on org-wide, not just who's free. A custom path
  tokenizer normalizes file paths into comparable concepts across repos with
  completely different naming conventions, scored by role (author vs.
  reviewer) and recency.
- **AI PR summaries** — a plain-language summary of what a PR changes and
  how it fits into the wider repo, generated from the diff plus repo context,
  cached per commit so re-reading an unchanged PR is free.
- **Onboarding mode** — when someone reviews a repo they've never touched
  before, they get an automatic orientation: how that part of the codebase
  works, the files worth reading first, related system-design diagrams, and
  recently merged PRs for context.
- **Cross-repo PR dependencies** — link "PR #142 can't merge until PR #89
  merges," even across different repos, with cycle detection so a dependency
  graph can never deadlock itself.
- **Org health dashboard** — stale PRs, overloaded reviewers, PRs blocked on
  other PRs, and repos gone quiet, computed live across every repo in the
  org.
- **Live everywhere** — PRs, issues, comments, and repository changes
  propagate to every open tab in real time over Server-Sent Events, driven
  by GitHub webhooks rather than polling.
- **Issue tracking, teams, notifications, and system-design boards** —
  round out the platform: a shared drawing surface per repo (with live
  multi-user editing over WebSockets), team membership, repo following, and
  a personal notification feed.

## Architecture

```
client/   Next.js (React, TypeScript, Tailwind) — the dashboard UI
server/   Express (TypeScript) — REST API, GitHub webhook receiver, SSE/WS
deploy/   nginx + pm2 + Let's Encrypt provisioning for a single EC2 instance
```

- **Database**: PostgreSQL via Prisma, hosted on Supabase.
- **Cache & real-time transport**: Redis — response caching for GitHub API
  calls, and pub/sub so SSE events fan out correctly across multiple server
  instances.
- **Auth**: Supabase Auth via GitHub OAuth.
- **AI**: Claude API (Anthropic) for PR summaries, onboarding overviews, and
  reviewer-suggestion evidence — with prompt caching on repo context and
  response caching per commit SHA to keep cost down.
- **Sync**: a GitHub webhook keeps everything live; each entity (PRs,
  issues, reviews, repositories) also has a manual "sync from GitHub" path
  for full backfills.

## Local development

Requires Node 22+, a Postgres database (Supabase or otherwise), and Redis
running locally.

```bash
npm install --prefix server && npm install --prefix client
cp server/.env.template server/.env             # fill in real values
cp client/.env.local.template client/.env.local # fill in real values
npm run dev                                     # runs both apps concurrently
```

`server/.env` needs Supabase credentials, a Postgres `DATABASE_URL`, a
GitHub personal access token + org name, a webhook secret, a Redis URL, and
an Anthropic API key. See `server/.env.template` for the full list.

Database schema changes live as hand-written, idempotent SQL in
`server/prisma/sql/`, applied in order and self-recorded in a
`schema_migrations` table — `npm run migrate:status` (in `server/`) reports
which files are applied, pending, or have drifted from what's on disk.

## Deployment

See [`deploy/README.md`](deploy/README.md) for the full runbook — EC2
provisioning, nginx + TLS setup, environment configuration, and wiring up
the GitHub webhook end to end.
