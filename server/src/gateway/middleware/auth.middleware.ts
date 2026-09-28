import type { Request, Response, NextFunction } from "express";
import { AuthHandler } from "../../services/auth.services";
import { IdentityError } from "../../services/identity.services";

export const AuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
 ) : Promise<void> => {

    const authorization = req.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;

    if (!token) {
        res.status(401).json({ error : "No Token Provided"});
        return
    }

    try {
        const identity = await AuthHandler.verifyAdmission(token);
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
    } catch (error) {
        const status = error instanceof IdentityError ? error.statusCode : 503;
        const message = error instanceof IdentityError ? error.message : 'Authentication is temporarily unavailable';
        res.status(status).json({ error: message });
    }

}
