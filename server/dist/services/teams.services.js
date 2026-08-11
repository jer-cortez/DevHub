"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsServices = void 0;
const teamMembershipsSB_1 = require("../supabase/teamMembershipsSB");
const users_services_1 = require("./users.services");
/**
 * A "team" here is just the set of people currently working on a repo —
 * there's no separate team entity. Joining a team is how a user tells the
 * server which project they're on, which is what makes personalized
 * notification fan-out possible.
 *
 * Membership is exclusive: one repo at a time, so moving to a new project
 * is a single join call rather than a leave-then-join pair.
 */
exports.TeamsServices = {
    async findForUser(userId) {
        return teamMembershipsSB_1.TeamMembershipsSB.findByUserId(userId);
    },
    /**
     * Joins the repo's members to their user rows in application code, since
     * this schema has no Prisma @relation attributes to do it in one query —
     * the same approach as OrganizationMembersServices.findAllWithUserInfo.
     */
    async findTeamForRepo(repoId) {
        const members = await teamMembershipsSB_1.TeamMembershipsSB.findByRepoId(repoId);
        if (members.length === 0)
            return [];
        const users = await users_services_1.UserServices.findByIds(members.map((m) => m.user_id));
        const usersById = new Map(users.map((u) => [u.id, u]));
        return members
            .filter((m) => usersById.has(m.user_id))
            .map((m) => ({
            id: m.id,
            joined_at: m.joined_at,
            user: usersById.get(m.user_id),
        }));
    },
    async join(userId, repoId) {
        return teamMembershipsSB_1.TeamMembershipsSB.join(userId, repoId);
    },
    async leave(userId) {
        return teamMembershipsSB_1.TeamMembershipsSB.leave(userId);
    },
};
