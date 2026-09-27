"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityError = void 0;
exports.githubProviderId = githubProviderId;
exports.bindVerifiedGithubIdentity = bindVerifiedGithubIdentity;
const client_1 = require("../generated/prisma/client");
const prismaClient_1 = require("../config/prismaClient");
class IdentityError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'IdentityError';
    }
}
exports.IdentityError = IdentityError;
function parseGithubId(value) {
    if (typeof value !== 'string' && typeof value !== 'number')
        return null;
    const text = String(value);
    if (!/^\d+$/.test(text))
        return null;
    const id = Number(text);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
/**
 * Reads the GitHub subject only from Supabase's provider identity record.
 * `user_metadata` is intentionally ignored because the authenticated user can
 * edit it themselves.
 */
function githubProviderId(user) {
    const githubIdentities = (user.identities ?? []).filter((identity) => identity.provider === 'github');
    if (githubIdentities.length !== 1) {
        throw new IdentityError('A single verified GitHub identity is required', 401, 'github_identity_required');
    }
    const identity = githubIdentities[0];
    const rawCandidates = [
        identity.id,
        identity.identity_data?.sub,
        identity.identity_data?.provider_id,
    ].filter((value) => value !== undefined && value !== null && value !== '');
    const candidates = rawCandidates.map(parseGithubId);
    if (candidates.length === 0 ||
        candidates.some((id) => id === null || id !== candidates[0])) {
        throw new IdentityError('The GitHub provider identity is invalid', 401, 'github_identity_invalid');
    }
    return candidates[0];
}
function assertCompatibleMappings(byAuthUser, byGithub, identity) {
    if (byAuthUser?.github_id != null && byAuthUser.github_id !== identity.githubId) {
        throw new IdentityError('This authenticated account is linked to a different GitHub identity', 409, 'identity_rebind');
    }
    if (byGithub?.auth_user_id != null && byGithub.auth_user_id !== identity.authUserId) {
        throw new IdentityError('This GitHub identity is linked to a different authenticated account', 409, 'identity_conflict');
    }
    if (byAuthUser && byGithub && byAuthUser.id !== byGithub.id) {
        throw new IdentityError('The authenticated and GitHub identities belong to different local users', 409, 'identity_conflict');
    }
    return byGithub ?? byAuthUser;
}
async function bindInTransaction(tx, identity) {
    // Always inspect both mappings. Returning early for auth_user_id would let a
    // stale mapping bypass a collision on the verified provider identity.
    const [byAuthUser, byGithub] = await Promise.all([
        tx.user.findUnique({ where: { auth_user_id: identity.authUserId } }),
        tx.user.findUnique({ where: { github_id: identity.githubId } }),
    ]);
    const existing = assertCompatibleMappings(byAuthUser, byGithub, identity);
    const profile = {
        auth_user_id: identity.authUserId,
        github_id: identity.githubId,
        username: identity.username,
        avatar_url: identity.avatarUrl,
        email: identity.email,
    };
    if (existing) {
        return tx.user.update({ where: { id: existing.id }, data: profile });
    }
    return tx.user.create({ data: profile });
}
function prismaErrorCode(error) {
    return error instanceof client_1.Prisma.PrismaClientKnownRequestError ? error.code : undefined;
}
/** Atomically attaches a verified provider identity to the stable local user. */
async function bindVerifiedGithubIdentity(identity) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            return await prismaClient_1.prisma.$transaction((tx) => bindInTransaction(tx, identity), { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
        }
        catch (error) {
            if (error instanceof IdentityError)
                throw error;
            const code = prismaErrorCode(error);
            if ((code === 'P2002' || code === 'P2034') && attempt < maxAttempts)
                continue;
            if (code === 'P2002') {
                throw new IdentityError('The authenticated identity is already linked to another user', 409, 'identity_conflict');
            }
            throw new IdentityError('Identity mapping is temporarily unavailable', 503, 'identity_unavailable');
        }
    }
    throw new IdentityError('Identity mapping is temporarily unavailable', 503, 'identity_unavailable');
}
