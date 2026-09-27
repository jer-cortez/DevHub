"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const auth_services_1 = require("../../services/auth.services");
const identity_services_1 = require("../../services/identity.services");
const AuthMiddleware = async (req, res, next) => {
    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    if (!token) {
        res.status(401).json({ error: "No Token Provided" });
        return;
    }
    try {
        const identity = await auth_services_1.AuthHandler.verifyGithubAdmission(token);
        req.user = {
            id: identity.authUserId,
            auth_user_id: identity.authUserId,
            username: identity.username,
            email: identity.email,
            avatar_url: identity.avatarUrl,
            github_id: identity.githubId,
            local_user: identity.localUser,
        };
        next();
    }
    catch (error) {
        const status = error instanceof identity_services_1.IdentityError ? error.statusCode : 503;
        const message = error instanceof identity_services_1.IdentityError ? error.message : 'Authentication is temporarily unavailable';
        res.status(status).json({ error: message });
    }
};
exports.AuthMiddleware = AuthMiddleware;
