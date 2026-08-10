# server

Express + TypeScript API for DevHub: REST endpoints for the dashboard, a
GitHub webhook receiver, and long-lived SSE/WebSocket connections for live
updates.

## Layers

Every feature is split across the same four layers, each with one job:

```
gateway/routes/*.routes.ts    → maps an HTTP verb + path to a controller method
controller/*.controller.ts    → parses the request, calls a service, shapes the response
services/*.services.ts        → business logic; the only layer allowed to talk to GitHub, Anthropic, or another service
supabase/*SB.ts               → the only layer allowed to talk to Prisma directly
```

`supabase/` is a slightly misleading name for what it is — it's the data
access layer (Prisma queries), named after the Postgres instance being
hosted on Supabase, not the Supabase SDK. Controllers never import Prisma
or call `octokit`/`anthropic` directly; that's what keeps a controller
readable as "parse → delegate → respond" with no business logic hiding in
it.

`lib/` holds cross-cutting infrastructure the services layer depends on:
the Redis clients (`redis.ts`), the SSE connection registry (`sse.ts`), the
GitHub and Anthropic API clients (`github.ts`, `anthropic.ts`), the
GitHub-response cache helper (`cache.ts`), and the file-path tokenizer used
by the reviewer-expertise matching (`pathSegments.ts`).

`gateway/middleware/` has three files, but only `auth.middleware.ts` is
actually wired into `server.ts` today — it resolves a Supabase bearer token
to a user and checks org membership before any route below it runs.
`rateLimit.middleware.ts` and `validate.middleware.ts` are scaffolded but
unimplemented stubs, not currently `app.use()`'d anywhere; if you wire
`validate.middleware.ts` in, note its `userValidate` signature has `req`
and `res` swapped from Express's normal parameter order, which will bite
silently once it's actually mounted.

## Request lifecycle, end to end

`POST /api/pull-requests/:id/summarize` (AI PR summary) is a good example
because it touches every layer plus an external API and a two-tier cache:

1. **Route** — [`gateway/routes/pullRequest.routes.ts`](src/gateway/routes/pullRequest.routes.ts)
   maps the path to `PullRequestController.summarize`. It's registered
   before the plain `/:id` route, deliberately — Express matches routes in
   registration order, so the more specific path has to come first or it's
   unreachable, shadowed by the generic one.
2. **Auth** — every route under `/api` (except `/api/webhooks`, see below)
   passes through `AuthMiddleware` first, in `server.ts`. By the time the
   controller runs, `req.user` is a verified, org-checked identity.
3. **Controller** — [`controller/pullRequest.controller.ts`](src/controller/pullRequest.controller.ts)'s
   `summarize` pulls `id` from the route params, calls
   `PrSummaryServices.getOrGenerate(id)`, and maps the result onto an HTTP
   response — including turning a service-level throw into a `500` with a
   safe message, never leaking an internal error string to the client.
4. **Service** — [`services/prSummary.services.ts`](src/services/prSummary.services.ts)
   is where the actual logic lives:
   - Checks whether the PR's stored `summary_sha` still matches its current
     `head_sha`; if so, returns the cached row and never calls the model —
     cost scales with PR *revisions*, not with how many people open the PR.
   - Otherwise fetches the diff (`PrDiffServices`, filtered and capped so a
     huge PR doesn't blow the token budget) and the repo's README + file
     tree (`repoContext`, cached in Redis *and* sent with Anthropic
     prompt-caching, since it's identical across every PR in that repo).
   - Calls the Claude API and writes the result back through the data layer.
5. **Data layer** — [`supabase/pullRequestSB.ts`](src/supabase/pullRequestSB.ts)'s
   `setSummary` is the only place that actually touches `prisma.pull_request.update`.

Nothing above imports Prisma except step 5, and nothing except step 4 calls
an external API — that's the layering doing its job, not a coincidence.

## The webhook route is the deliberate exception

[`gateway/routes/webhooks.routes.ts`](src/gateway/routes/webhooks.routes.ts)
is mounted in `server.ts` *before* the global `express.json()` and
`AuthMiddleware` calls, with its own `express.raw()` on the route:

- **Before `express.json()`**: GitHub signs the *exact bytes* of the request
  body. `express.json()` would parse and discard the original buffer, and
  `JSON.stringify(JSON.parse(body))` isn't guaranteed to byte-for-byte match
  what GitHub sent — so signature verification needs the raw body, which
  only `express.raw()` preserves.
- **Before `AuthMiddleware`**: GitHub isn't a Supabase-authenticated user
  and has no bearer token to present. The webhook's own HMAC signature
  check (in `services/webhooks.services.ts`, using `crypto.timingSafeEqual`
  rather than `===` — a naive comparison leaks timing information an
  attacker could use to guess a valid signature byte by byte) *is* its
  auth, playing the same role `AuthMiddleware` plays for every other route.

## Real-time: SSE and WebSockets

Two independent live-update mechanisms, both fed by the same webhook
handler:

- **SSE** (`lib/sse.ts`, `controller/events.controller.ts`) — repo-scoped
  live updates for PRs, issues, comments, and repositories. The webhook
  handler never writes to a browser connection directly; it only publishes
  to a Redis channel. Every server instance subscribes to that same channel
  and forwards to whichever browsers happen to be connected *to that
  instance* — the mechanism that makes this correct with more than one
  server process, not just a single-instance convenience.
- **WebSockets** (`lib/boardSocket.ts`) — bidirectional live editing for the
  system-design drawing boards, upgraded from the same HTTP server in
  `server.ts` rather than a separate port.

## Scripts

`src/scripts/` holds one-off operational tools run via `ts-node`, not part
of the request path: `migrationStatus.ts` (`npm run migrate:status` — see
the root README), `backfillExpertise.ts` (indexes historical merged PRs for
reviewer matching), and `simulateWebhook.ts` (`npm run webhook:simulate` —
sends a signed, realistic webhook payload at a running server, local or
deployed, without waiting on a real GitHub event).
