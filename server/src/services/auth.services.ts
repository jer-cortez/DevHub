import type { User } from "@supabase/supabase-js";
import { octokit } from "../lib/github";
import { supabaseAdmin } from "../config/supabaseClient";
import { prisma } from "../config/prismaClient";
import {
    bindVerifiedGithubIdentity,
    githubProviderId,
    IdentityError,
    type VerifiedGithubIdentity,
} from "./identity.services";
import { admitConfirmedEmail } from './emailAdmission.services';
import type { User as LocalUser } from "../generated/prisma/client";

export type AdmittedIdentity = { authUserId: string; githubId: number | null; username: string; avatarUrl?: string; email?: string; localUser: LocalUser };
export type AdmittedGithubIdentity = VerifiedGithubIdentity & { localUser: LocalUser };

function configuredOrganizationName(): string {
    const name = process.env.GITHUB_ORG_NAME?.trim();
    if (!name) {
        throw new IdentityError('GitHub organization is not configured', 503, 'github_organization_unavailable');
    }
    return name;
}

export const AuthHandler = { 
    async verifyOrgMembership(username: string, organizationName = configuredOrganizationName()): Promise<boolean> {
        try { 
        const respone = await octokit.rest.orgs.checkPublicMembershipForUser({ 
            org: organizationName,
            username
        }); 
        return respone.status === 204
        } catch(error: any) { 
            if (error.status === 404) { 
                return false
            }
            throw new IdentityError('GitHub organization membership could not be verified', 503, 'github_unavailable');
        }
    }, 
    async verifySupabaseToken(token: string): Promise<User | null>  {
        try { 
            const { data, error } = await supabaseAdmin.auth.getUser(token);

            if (error || !data.user ) { 
                return null
            };

            return data.user
        } catch { 
            return null
        }
    },
    async resolveGithubIdentity(user: User): Promise<VerifiedGithubIdentity> {
        const githubId = githubProviderId(user);
        try {
            const { data } = await octokit.rest.users.getById({ account_id: githubId });
            if (data.id !== githubId || !data.login) {
                throw new IdentityError('The GitHub provider identity could not be verified', 401, 'github_identity_invalid');
            }
            return {
                authUserId: user.id,
                githubId,
                username: data.login,
                avatarUrl: data.avatar_url || undefined,
                email: data.email || undefined,
            };
        } catch (error: any) {
            if (error instanceof IdentityError) throw error;
            if (error?.status === 404) {
                throw new IdentityError('The GitHub provider identity could not be verified', 401, 'github_identity_invalid');
            }
            throw new IdentityError('GitHub identity verification is temporarily unavailable', 503, 'github_unavailable');
        }
    },
    async verifyAdmission(token: string): Promise<AdmittedIdentity> {
        // Configuration failures must stop before token, GitHub, or database
        // calls so a deployment cannot admit users against an implicit org.
        const organizationName = configuredOrganizationName();
        const user = await this.verifySupabaseToken(token);
        if (!user) {
            throw new IdentityError('Invalid or expired token', 401, 'invalid_token');
        }
        if (!(user.identities ?? []).some(identity => identity.provider === 'github')) {
            const admitted = await admitConfirmedEmail(user, organizationName);
            return { authUserId: user.id, githubId: null, username: admitted.localUser.username, email: admitted.email, avatarUrl: admitted.localUser.avatar_url ?? undefined, localUser: admitted.localUser };
        }
        const identity = await this.resolveGithubIdentity(user);
        const isMember = await this.verifyOrgMembership(identity.username, organizationName);
        if (!isMember) {
            throw new IdentityError('You are not a member of this organization', 403, 'organization_membership_required');
        }
        // Bind only after GitHub admission succeeds. This checks both unique
        // identity keys even for read-only endpoints, so a stale auth mapping
        // cannot bypass a collision on the verified GitHub account.
        const localUser = await bindVerifiedGithubIdentity(identity);
        try {
            const organizations = await prisma.organizations.findMany({
                where: { name: { equals: organizationName, mode: 'insensitive' } },
                select: { id: true },
                take: 2,
            });
            if (organizations.length > 1) {
                throw new IdentityError('Workspace organization configuration is ambiguous', 503, 'workspace_unavailable');
            }
            if (organizations.length === 1) {
                const membership = await prisma.organization_members.findUnique({
                    where: {
                        user_id_org_id: {
                            user_id: localUser.id,
                            org_id: organizations[0].id,
                        },
                    },
                    select: { status: true },
                });
                if (membership?.status === 'inactive') {
                    throw new IdentityError('Your organization membership is inactive', 403, 'organization_membership_inactive');
                }
            }
        } catch (error) {
            if (error instanceof IdentityError) throw error;
            throw new IdentityError('Local organization membership could not be verified', 503, 'workspace_unavailable');
        }
        return { ...identity, localUser };
    },
    // Preserve callers of the checkpoint-1 admission method.
    async verifyGithubAdmission(token: string): Promise<AdmittedIdentity> {
        return this.verifyAdmission(token);
    }
}
