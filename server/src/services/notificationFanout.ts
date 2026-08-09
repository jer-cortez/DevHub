import { TeamMembershipsSB } from '../supabase/teamMembershipsSB';
import { RepoFollowersSB, type FollowPreferences } from '../supabase/repoFollowersSB';
import { NotificationsSB } from '../supabase/notificationsSB';
import { redisPub, USER_EVENTS_CHANNEL } from '../lib/redis';
import type { notifications, Prisma } from '../generated/prisma/client';

export type NotificationType = 'pull_request' | 'issue' | 'comment';

/** Maps an event type to the follower preference column that opts into it. Team members bypass this map — they receive every type for their own repo. */
const PREFERENCE_BY_TYPE: Record<NotificationType, keyof FollowPreferences> = {
  pull_request: 'notify_pull_requests',
  issue: 'notify_issues',
  comment: 'notify_comments',
};

export interface FanOutInput {
  type: NotificationType;
  repoId: string;
  /** Local `users.id` of whoever caused the event. Excluded from recipients. */
  actorId: string;
  /** Rendered summary, stored on the row — see the denormalization note in the migration SQL. */
  title: string;
  url: string;
  prId?: string | null;
  issueId?: string | null;
  commentId?: string | null;
  /** Users this event *directly* concerns (PR author, requested reviewers, issue assignee). Flagged `is_direct` so the UI can surface them above general repo chatter. */
  directUserIds?: string[];
}

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
export async function fanOut(input: FanOutInput): Promise<notifications[]> {
  const [teamMembers, followers] = await Promise.all([
    TeamMembershipsSB.findByRepoId(input.repoId),
    RepoFollowersSB.findSubscribedToRepo(input.repoId, PREFERENCE_BY_TYPE[input.type]),
  ]);

  // A Set both merges the two audiences and dedupes anyone who is a team
  // member *and* a follower of the same repo.
  const recipientIds = new Set<string>();
  for (const member of teamMembers) recipientIds.add(member.user_id);
  for (const follower of followers) recipientIds.add(follower.user_id);

  // Never notify someone about their own action.
  recipientIds.delete(input.actorId);
  if (recipientIds.size === 0) return [];

  const direct = new Set(input.directUserIds ?? []);

  const rows: Prisma.notificationsCreateManyInput[] = [...recipientIds].map((userId) => ({
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

  const created = await NotificationsSB.createMany(rows);

  // Published one message per recipient rather than one broadcast, because
  // the subscriber side (userNotificationStream.ts) routes by userId — a
  // single fan-in message would force every instance to re-derive the
  // routing that's already been computed here.
  await Promise.all(
    created.map((notification) =>
      redisPub.publish(
        USER_EVENTS_CHANNEL,
        JSON.stringify({ userId: notification.user_id, notification })
      )
    )
  );

  return created;
}
