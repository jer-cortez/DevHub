"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamRoles = exports.organizationRoles = void 0;
exports.isOrganizationRole = isOrganizationRole;
exports.isTeamRole = isTeamRole;
exports.isTeamLead = isTeamLead;
exports.workspacePermissions = workspacePermissions;
exports.canManageTeamMember = canManageTeamMember;
/** Workspace policy is deliberately independent of HTTP and database access. */
exports.organizationRoles = ['member', 'admin'];
exports.teamRoles = ['developer', 'designer', 'tech_lead', 'project_manager'];
function isOrganizationRole(value) {
    return exports.organizationRoles.some(role => role === value);
}
function isTeamRole(value) {
    return exports.teamRoles.some(role => role === value);
}
function isTeamLead(role) {
    return role === 'tech_lead' || role === 'project_manager';
}
function workspacePermissions(actor) {
    const active = actor.active && actor.organizationRole !== null
        && isOrganizationRole(actor.organizationRole)
        && (actor.team === null || isTeamRole(actor.team.role));
    const admin = active && actor.organizationRole === 'admin';
    const teamMember = active && actor.team !== null;
    const lead = teamMember && isTeamLead(actor.team.role);
    return {
        viewProjects: active,
        followProjects: active,
        viewOrganizationOverview: admin,
        manageOrganizationMembers: admin,
        createTeamTasks: teamMember,
        manageTeamTasks: lead,
        approveTeamTasks: lead,
        manageTeamSprints: lead,
        manageTeamContributors: lead || admin,
    };
}
/** Admins manage membership, but do not gain task-approval power across teams. */
function canManageTeamMember(actor, targetRepoId, current, proposedRole) {
    if (!actor.active || !actor.organizationRole || !isOrganizationRole(actor.organizationRole))
        return false;
    if (actor.team && !isTeamRole(actor.team.role))
        return false;
    if (current && !isTeamRole(current.role))
        return false;
    if (proposedRole !== null && !isTeamRole(proposedRole))
        return false;
    if (actor.organizationRole === 'admin')
        return true;
    if (!actor.team || actor.team.repoId !== targetRepoId || !isTeamLead(actor.team.role))
        return false;
    if (current && (current.repoId !== targetRepoId || isTeamLead(current.role)))
        return false;
    return proposedRole === null || !isTeamLead(proposedRole);
}
