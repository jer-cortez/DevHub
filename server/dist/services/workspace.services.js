"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceServices = exports.WorkspaceError = void 0;
const prismaClient_1 = require("../config/prismaClient");
const workspacePolicy_1 = require("./workspacePolicy");
class WorkspaceError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.WorkspaceError = WorkspaceError;
exports.WorkspaceServices = {
    async actorForUser(userId) {
        const organizationName = process.env.GITHUB_ORG_NAME;
        if (!organizationName)
            throw new WorkspaceError(503, 'Workspace organization is not configured');
        const organizations = await prismaClient_1.prisma.organizations.findMany({
            where: { name: { equals: organizationName, mode: 'insensitive' } },
            select: { id: true }, take: 2,
        });
        if (organizations.length !== 1) {
            throw new WorkspaceError(503, 'Sync and configure a single workspace organization first');
        }
        const organizationId = organizations[0].id;
        const [membership, team] = await Promise.all([
            prismaClient_1.prisma.organization_members.findUnique({ where: { user_id_org_id: { user_id: userId, org_id: organizationId } } }),
            prismaClient_1.prisma.team_memberships.findUnique({ where: { user_id: userId } }),
        ]);
        const role = membership && (0, workspacePolicy_1.isOrganizationRole)(membership.role) ? membership.role : null;
        const active = membership?.status === 'active' && role !== null;
        // A stale/foreign-org team row must never grant project privileges.
        const repo = team && active && (0, workspacePolicy_1.isTeamRole)(team.role)
            ? await prismaClient_1.prisma.repositories.findFirst({ where: { id: team.repo_id, org_id: organizationId }, select: { id: true } })
            : null;
        return {
            userId, organizationId, organizationRole: role, active,
            team: team && repo && (0, workspacePolicy_1.isTeamRole)(team.role) ? { repoId: repo.id, role: team.role } : null,
        };
    },
    async current(userId) {
        const actor = await this.actorForUser(userId);
        return { ...actor, permissions: (0, workspacePolicy_1.workspacePermissions)(actor) };
    },
};
