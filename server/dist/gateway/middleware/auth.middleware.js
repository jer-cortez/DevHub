"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const auth_services_1 = require("../../services/auth.services");
const AuthMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
        res.status(401).json({ error: "No Token Provided" });
        return;
    }
    const user = await auth_services_1.AuthHandler.verifySupabaseToken(token);
    if (!user) {
        res.status(401).json({ error: "Invaild or expired token" });
        return;
    }
    const username = user.user_metadata.user_name;
    const isMember = await auth_services_1.AuthHandler.verifyOrgMembership(username, token);
    if (!isMember) {
        res.status(403).json({ error: "You are not a member of this organization" });
        return;
    }
    req.user = {
        id: user.id,
        username,
        email: user.email,
        avatar_url: user.user_metadata.avatar_url,
        github_id: Number(user.user_metadata.provider_id),
    };
    next();
};
exports.AuthMiddleware = AuthMiddleware;
