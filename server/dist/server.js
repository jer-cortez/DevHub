"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Must run before anything that might do a DNS lookup — in particular
// before prismaClient.ts constructs its pg Pool (imported transitively via
// the routers below). Supabase's Postgres hostname resolves to both an IPv4
// and IPv6 address; Node's default DNS ordering can prefer the IPv6 one,
// and on a VPC subnet without IPv6 routing (the AWS default) that fails
// with ENETUNREACH while the IPv4 address would have connected fine. This
// tells Node to always try IPv4 first instead.
const node_dns_1 = __importDefault(require("node:dns"));
node_dns_1.default.setDefaultResultOrder('ipv4first');
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const users_routes_1 = require("./gateway/routes/users.routes");
const pullRequest_routes_1 = require("./gateway/routes/pullRequest.routes");
const repositories_routes_1 = require("./gateway/routes/repositories.routes");
const organizations_routes_1 = require("./gateway/routes/organizations.routes");
const organizationMembers_routes_1 = require("./gateway/routes/organizationMembers.routes");
const repoFollowers_routes_1 = require("./gateway/routes/repoFollowers.routes");
const reviews_routes_1 = require("./gateway/routes/reviews.routes");
const reviewComments_routes_1 = require("./gateway/routes/reviewComments.routes");
const pullRequestReviewers_routes_1 = require("./gateway/routes/pullRequestReviewers.routes");
const drawingBoards_routes_1 = require("./gateway/routes/drawingBoards.routes");
const drawingBoardCollaborators_routes_1 = require("./gateway/routes/drawingBoardCollaborators.routes");
const notifications_routes_1 = require("./gateway/routes/notifications.routes");
const teams_routes_1 = require("./gateway/routes/teams.routes");
const issues_routes_1 = require("./gateway/routes/issues.routes");
const auth_routes_1 = require("./gateway/routes/auth.routes");
const code_routes_1 = require("./gateway/routes/code.routes");
const orgHealth_routes_1 = require("./gateway/routes/orgHealth.routes");
const prDependencies_routes_1 = require("./gateway/routes/prDependencies.routes");
const expertise_routes_1 = require("./gateway/routes/expertise.routes");
const onboarding_routes_1 = require("./gateway/routes/onboarding.routes");
const webhooks_routes_1 = require("./gateway/routes/webhooks.routes");
const events_routes_1 = require("./gateway/routes/events.routes");
const auth_middleware_1 = require("./gateway/middleware/auth.middleware");
const http_1 = __importDefault(require("http"));
const boardSocket_1 = require("./lib/boardSocket");
// Handle BigInt serialization for repo_followers
BigInt.prototype.toJSON = function () { return this.toString(); };
const app = (0, express_1.default)();
// Every managed host (Railway, Render, Fly, Heroku) assigns a port and
// injects it as PORT — an app that binds a fixed port there is started,
// reported healthy, and never receives a single request. 8080 stays as the
// local default.
const PORT = Number(process.env.PORT) || 8080;
const server = http_1.default.createServer(app);
// Restricted to the deployed client when CLIENT_ORIGIN is set, open in
// development where it isn't. Auth travels as a Bearer token rather than a
// cookie, so this isn't load-bearing for security — it's to stop other
// origins driving the API from a user's browser.
app.use((0, cors_1.default)({ origin: process.env.CLIENT_ORIGIN || true }));
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
app.use((0, compression_1.default)({
    filter: (req, res) => res.getHeader('Content-Type') === 'text/event-stream'
        ? false
        : compression_1.default.filter(req, res),
}));
// Mounted before express.json() and AuthMiddleware, deliberately:
// - GitHub is not a Supabase-authenticated user, so this can't sit behind
//   the global auth check like everything else.
// - The webhook route needs the raw request body (via its own
//   express.raw() on the route itself) to verify GitHub's signature;
//   express.json() below would consume and parse the body first,
//   destroying the exact bytes the signature was computed over.
app.use('/api/webhooks', webhooks_routes_1.webhooksRouter);
app.use(express_1.default.json());
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
app.use(auth_middleware_1.AuthMiddleware);
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/users', users_routes_1.usersRouter);
app.use('/api/pull-requests', pullRequest_routes_1.pullRequestRouter);
app.use('/api/repositories', repositories_routes_1.repositoriesRouter);
app.use('/api/repositories', events_routes_1.eventsRouter);
app.use('/api/code', code_routes_1.codeRouter);
app.use('/api/organizations', organizations_routes_1.organizationsRouter);
app.use('/api/org-members', organizationMembers_routes_1.orgMembersRouter);
app.use('/api/repo-followers', repoFollowers_routes_1.repoFollowersRouter);
app.use('/api/reviews', reviews_routes_1.reviewsRouter);
app.use('/api/review-comments', reviewComments_routes_1.reviewCommentsRouter);
app.use('/api/pr-reviewers', pullRequestReviewers_routes_1.prReviewersRouter);
app.use('/api/drawing-boards', drawingBoards_routes_1.drawingBoardsRouter);
app.use('/api/board-collaborators', drawingBoardCollaborators_routes_1.boardCollaboratorsRouter);
app.use('/api/notifications', notifications_routes_1.notificationsRouter);
app.use('/api/teams', teams_routes_1.teamsRouter);
app.use('/api/issues', issues_routes_1.issuesRouter);
app.use('/api/org-health', orgHealth_routes_1.orgHealthRouter);
app.use('/api/pr-dependencies', prDependencies_routes_1.prDependenciesRouter);
app.use('/api/expertise', expertise_routes_1.expertiseRouter);
app.use('/api/onboarding', onboarding_routes_1.onboardingRouter);
server.on('upgrade', (req, socket, head) => {
    const match = req.url?.match(/^\/ws\/boards\/([^/?]+)/);
    if (!match) {
        socket.destroy();
        return;
    }
    boardSocket_1.wss.handleUpgrade(req, socket, head, (ws) => {
        boardSocket_1.wss.emit('connection', ws, req, match[1]); // match[1] is the boardId
    });
});
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
