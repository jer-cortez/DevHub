"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHandler = void 0;
const github_1 = require("../lib/github");
const supabaseClient_1 = require("../config/supabaseClient");
const prismaClient_1 = require("../config/prismaClient");
const identity_services_1 = require("./identity.services");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
exports.AuthHandler = {
    async verifyOrgMembership(username, userToken) {
        try {
            const respone = await github_1.octokit.rest.orgs.checkPublicMembershipForUser({
                org: ORG_NAME,
                username
            });
            return respone.status === 204;
        }
        catch (error) {
            if (error.status === 404) {
                return false;
            }
            throw new identity_services_1.IdentityError('GitHub organization membership could not be verified', 503, 'github_unavailable');
        }
    },
    async verifySupabaseToken(token) {
        try {
            const { data, error } = await supabaseClient_1.supabaseAdmin.auth.getUser(token);
            if (error || !data.user) {
                return null;
            }
            ;
            return data.user;
        }
        catch {
            return null;
        }
    },
    async resolveGithubIdentity(user) {
        const githubId = (0, identity_services_1.githubProviderId)(user);
        try {
            const { data } = await github_1.octokit.rest.users.getById({ account_id: githubId });
            if (data.id !== githubId || !data.login) {
                throw new identity_services_1.IdentityError('The GitHub provider identity could not be verified', 401, 'github_identity_invalid');
            }
            return {
                authUserId: user.id,
                githubId,
                username: data.login,
                avatarUrl: data.avatar_url || undefined,
                email: data.email || undefined,
            };
        }
        catch (error) {
            if (error instanceof identity_services_1.IdentityError)
                throw error;
            if (error?.status === 404) {
                throw new identity_services_1.IdentityError('The GitHub provider identity could not be verified', 401, 'github_identity_invalid');
            }
            throw new identity_services_1.IdentityError('GitHub identity verification is temporarily unavailable', 503, 'github_unavailable');
        }
    },
    async verifyGithubAdmission(token) {
        const user = await this.verifySupabaseToken(token);
        if (!user) {
            throw new identity_services_1.IdentityError('Invalid or expired token', 401, 'invalid_token');
        }
        const identity = await this.resolveGithubIdentity(user);
        const isMember = await this.verifyOrgMembership(identity.username, token);
        if (!isMember) {
            throw new identity_services_1.IdentityError('You are not a member of this organization', 403, 'organization_membership_required');
        }
        // Bind only after GitHub admission succeeds. This checks both unique
        // identity keys even for read-only endpoints, so a stale auth mapping
        // cannot bypass a collision on the verified GitHub account.
        const localUser = await (0, identity_services_1.bindVerifiedGithubIdentity)(identity);
        try {
            const organizations = await prismaClient_1.prisma.organizations.findMany({
                where: { name: { equals: ORG_NAME, mode: 'insensitive' } },
                select: { id: true },
                take: 2,
            });
            if (organizations.length > 1) {
                throw new identity_services_1.IdentityError('Workspace organization configuration is ambiguous', 503, 'workspace_unavailable');
            }
            if (organizations.length === 1) {
                const membership = await prismaClient_1.prisma.organization_members.findUnique({
                    where: {
                        user_id_org_id: {
                            user_id: localUser.id,
                            org_id: organizations[0].id,
                        },
                    },
                    select: { status: true },
                });
                if (membership?.status === 'inactive') {
                    throw new identity_services_1.IdentityError('Your organization membership is inactive', 403, 'organization_membership_inactive');
                }
            }
        }
        catch (error) {
            if (error instanceof identity_services_1.IdentityError)
                throw error;
            throw new identity_services_1.IdentityError('Local organization membership could not be verified', 503, 'workspace_unavailable');
        }
        return { ...identity, localUser };
    }
};
