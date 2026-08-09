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
import { authRouter } from './gateway/routes/auth.routes';
import { codeRouter } from './gateway/routes/code.routes';
import { webhooksRouter } from './gateway/routes/webhooks.routes';
import { eventsRouter } from './gateway/routes/events.routes';
import { AuthMiddleware } from './gateway/middleware/auth.middleware';
import http from 'http';
import { wss } from './lib/boardSocket';

// Handle BigInt serialization for repo_followers
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

const app = express();
const PORT = 8080;
const server = http.createServer(app)

app.use(cors());
// Compresses response bodies (gzip) above the default 1kb threshold — pure
// win for anything returning a real payload (repo listings, code contents,
// PR lists), and doesn't touch incoming request bodies, so it's safe to
// apply globally, including in front of the webhook route below.
app.use(compression());

// Mounted before express.json() and AuthMiddleware, deliberately:
// - GitHub is not a Supabase-authenticated user, so this can't sit behind
//   the global auth check like everything else.
// - The webhook route needs the raw request body (via its own
//   express.raw() on the route itself) to verify GitHub's signature;
//   express.json() below would consume and parse the body first,
//   destroying the exact bytes the signature was computed over.
app.use('/api/webhooks', webhooksRouter);

app.use(express.json());

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

