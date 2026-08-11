"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fanOut = fanOut;
const teamMembershipsSB_1 = require("../supabase/teamMembershipsSB");
const repoFollowersSB_1 = require("../supabase/repoFollowersSB");
const notificationsSB_1 = require("../supabase/notificationsSB");
const redis_1 = require("../lib/redis");
/** Maps an event type to the follower preference column that opts into it. Team members bypass this map — they receive every type for their own repo. */
const PREFERENCE_BY_TYPE = {
    pull_request: 'notify_pull_requests',
    issue: 'notify_issues',
    comment: 'notify_comments',
};
/**
 * Turns one repo event into per-user notification rows and pushes them out
 * live.
 *
 * Two audiences, deliberately asymmetric:
 *  - **Team members** of the repo get every event type. They work on this
 *    project, so general activity is signal for them.
 *  - **Followers** only get the types they opted into, since they're
 *    watching someone else's project and asked for a narrower feed.
 *
 * A user who is both is counted once, with the team's broader rules winning.
 */
async function fanOut(input) {
    const [teamMembers, followers] = await Promise.all([
        teamMembershipsSB_1.TeamMembershipsSB.findByRepoId(input.repoId),
        repoFollowersSB_1.RepoFollowersSB.findSubscribedToRepo(input.repoId, PREFERENCE_BY_TYPE[input.type]),
    ]);
    // A Set both merges the two audiences and dedupes anyone who is a team
    // member *and* a follower of the same repo.
    const recipientIds = new Set();
    for (const member of teamMembers)
        recipientIds.add(member.user_id);
    for (const follower of followers)
        recipientIds.add(follower.user_id);
    // Never notify someone about their own action.
    recipientIds.delete(input.actorId);
    if (recipientIds.size === 0)
        return [];
    const direct = new Set(input.directUserIds ?? []);
    const rows = [...recipientIds].map((userId) => ({
        user_id: userId,
        type: input.type,
        repo_id: input.repoId,
        actor_id: input.actorId,
        pr_id: input.prId ?? null,
        issue_id: input.issueId ?? null,
        comment_id: input.commentId ?? null,
        title: input.title,
        url: input.url,
        is_direct: direct.has(userId),
        is_read: false,
    }));
    const created = await notificationsSB_1.NotificationsSB.createMany(rows);
    // Published one message per recipient rather than one broadcast, because
    // the subscriber side (userNotificationStream.ts) routes by userId — a
    // single fan-in message would force every instance to re-derive the
    // routing that's already been computed here.
    await Promise.all(created.map((notification) => redis_1.redisPub.publish(redis_1.USER_EVENTS_CHANNEL, JSON.stringify({ userId: notification.user_id, notification }))));
    return created;
}
