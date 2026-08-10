import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { usersRouter } from './gateway/routes/users.routes';
import { pullRequestRouter } from './gateway/routes/pullRequest.routes';
import { repositoriesRouter } from './gateway/routes/repositories.routes';
import { organizationsRouter } from './gateway/routes/organizations.routes';
import { orgMembersRouter } from './gateway/routes/organizationMembers.routes';
import { repoFollowersRouter } from './gateway/routes/repoFollowers.routes';
import { reviewsRouter } from './gateway/routes/reviews.routes';
import { reviewCommentsRouter } from './gateway/routes/reviewComments.routes';
import { prReviewersRouter } from './gateway/routes/pullRequestReviewers.routes';
import { drawingBoardsRouter } from './gateway/routes/drawingBoards.routes';
import { boardCollaboratorsRouter } from './gateway/routes/drawingBoardCollaborators.routes';
import { notificationsRouter } from './gateway/routes/notifications.routes';
import { teamsRouter } from './gateway/routes/teams.routes';
import { issuesRouter } from './gateway/routes/issues.routes';
import { authRouter } from './gateway/routes/auth.routes';
import { codeRouter } from './gateway/routes/code.routes';
import { orgHealthRouter } from './gateway/routes/orgHealth.routes';
import { prDependenciesRouter } from './gateway/routes/prDependencies.routes';
import { expertiseRouter } from './gateway/routes/expertise.routes';
import { onboardingRouter } from './gateway/routes/onboarding.routes';
import { webhooksRouter } from './gateway/routes/webhooks.routes';
import { eventsRouter } from './gateway/routes/events.routes';
import { AuthMiddleware } from './gateway/middleware/auth.middleware';
import http from 'http';
import { wss } from './lib/boardSocket';

// Handle BigInt serialization for repo_followers
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

const app = express();

// Every managed host (Railway, Render, Fly, Heroku) assigns a port and
// injects it as PORT — an app that binds a fixed port there is started,
// reported healthy, and never receives a single request. 8080 stays as the
// local default.
const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app)

// Restricted to the deployed client when CLIENT_ORIGIN is set, open in
// development where it isn't. Auth travels as a Bearer token rather than a
// cookie, so this isn't load-bearing for security — it's to stop other
// origins driving the API from a user's browser.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
// Compresses response bodies (gzip) above the default 1kb threshold — pure
// win for anything returning a real payload (repo listings, code contents,
// PR lists), and doesn't touch incoming request bodies, so it's safe to
// apply globally, including in front of the webhook route below.
// Server-sent events must bypass compression. The middleware buffers writes
// until it has enough bytes to decide whether compressing is worthwhile, so
// small SSE frames sit in that buffer instead of reaching the browser —
// live PR updates and notifications arrive late, or in batches when a
// heartbeat finally pushes the buffer over the threshold. Behind a hosting
// proxy this gets worse, not better.
app.use(
  compression({
    filter: (req, res) =>
      res.getHeader('Content-Type') === 'text/event-stream'
        ? false
        : compression.filter(req, res),
  })
);

// Mounted before express.json() and AuthMiddleware, deliberately:
// - GitHub is not a Supabase-authenticated user, so this can't sit behind
//   the global auth check like everything else.
// - The webhook route needs the raw request body (via its own
//   express.raw() on the route itself) to verify GitHub's signature;
//   express.json() below would consume and parse the body first,
//   destroying the exact bytes the signature was computed over.
app.use('/api/webhooks', webhooksRouter);

app.use(express.json());

// Unauthenticated and dependency-free, for platform health checks. Kept
// deliberately dumb: if it also probed Postgres and Redis, a slow database
// would make the host consider the process dead and restart it, turning a
// degraded API into a crash loop.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/home', (req, res) => {
  res.json({ message: 'Hello World!', pet: ['dog', 'cat', 'bird'] });
});

app.use(AuthMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/pull-requests', pullRequestRouter);
app.use('/api/repositories', repositoriesRouter);
app.use('/api/repositories', eventsRouter);
app.use('/api/code', codeRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/org-members', orgMembersRouter);
app.use('/api/repo-followers', repoFollowersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/review-comments', reviewCommentsRouter);
app.use('/api/pr-reviewers', prReviewersRouter);
app.use('/api/drawing-boards', drawingBoardsRouter);
app.use('/api/board-collaborators', boardCollaboratorsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/org-health', orgHealthRouter);
app.use('/api/pr-dependencies', prDependenciesRouter);
app.use('/api/expertise', expertiseRouter);
app.use('/api/onboarding', onboardingRouter);


server.on('upgrade', (req, socket, head) => {
  const match = req.url?.match(/^\/ws\/boards\/([^/?]+)/);
  if (!match) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, match[1]); // match[1] is the boardId
  });
});

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

