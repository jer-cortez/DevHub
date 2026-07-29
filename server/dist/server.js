"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
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
const auth_routes_1 = require("./gateway/routes/auth.routes");
const code_routes_1 = require("./gateway/routes/code.routes");
const auth_middleware_1 = require("./gateway/middleware/auth.middleware");
// Handle BigInt serialization for repo_followers
BigInt.prototype.toJSON = function () { return this.toString(); };
const app = (0, express_1.default)();
const PORT = 8080;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/api/home', (req, res) => {
    res.json({ message: 'Hello World!', pet: ['dog', 'cat', 'bird'] });
});
app.use(auth_middleware_1.AuthMiddleware);
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/users', users_routes_1.usersRouter);
app.use('/api/pull-requests', pullRequest_routes_1.pullRequestRouter);
app.use('/api/repositories', repositories_routes_1.repositoriesRouter);
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
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
