"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrgHealthServices = exports.REVIEWER_OVERLOAD_THRESHOLD = void 0;
const prismaClient_1 = require("../config/prismaClient");
/**
 * Org health dashboard: the review bottlenecks a team lead would otherwise
 * piece together by hand across every repo.
 *
 * Written as raw SQL rather than Prisma queries because every section needs
 * a "latest activity across several tables" rollup, which `findMany` can't
 * express without pulling whole tables into Node and reducing there. These
 * are also deliberately *not* wrapped in `cached()` — that helper exists for
 * GitHub's slow, rate-limited API (see lib/cache.ts); these are indexed
 * Postgres reads that are already fast, and a stale bottleneck view is worse
 * than a slightly slower one.
 */
/** A PR is stale when nothing has happened on it for this long. */
const STALE_PR_DAYS = 7;
/** A repo is quiet when it has had no PR or issue activity for this long. */
const QUIET_REPO_DAYS = 30;
/** Above this many open review requests, a person is a bottleneck. */
exports.REVIEWER_OVERLOAD_THRESHOLD = 5;
const SECTION_LIMIT = 20;
/**
 * The newest thing that has happened on each open PR. Its own creation counts,
 * so a brand-new PR with no reviews isn't reported as a week stale.
 */
const OPEN_PR_ACTIVITY = `
  select
    p.id,
    p.repo_id,
    p.github_pr_number,
    p.title,
    p.github_url,
    p.created_at,
    p.author_id,
    greatest(
      p.created_at,
      coalesce((select max(rv.submitted_at) from reviews rv where rv.pr_id = p.id), p.created_at),
      coalesce((select max(rc.created_at) from review_comments rc where rc.pr_id = p.id), p.created_at)
    ) as last_activity_at,
    (select count(*) from pull_request_reviewers prr
       where prr.pr_id = p.id and prr.status = 'pending')::int as reviewer_count,
    (select count(*) from reviews rv where rv.pr_id = p.id)::int as review_count
  from pull_request p
  where p.status = 'open'
`;
exports.OrgHealthServices = {
    async getDashboard() {
        const [summaryRows, stalePrs, reviewerLoad, quietRepos, blockedPrs] = await Promise.all([
            prismaClient_1.prisma.$queryRawUnsafe(`
        with activity as (${OPEN_PR_ACTIVITY})
        select
          (select count(*) from activity)::int as open_prs,
          (select count(*) from activity where reviewer_count > 0 and review_count = 0)::int as awaiting_first_review,
          (select count(*) from activity where reviewer_count = 0)::int as unassigned_prs,
          (select count(*) from activity
             where last_activity_at < now() - interval '${STALE_PR_DAYS} days')::int as stale_prs,
          (select count(*) from (
             select prr.user_id from pull_request_reviewers prr
               join pull_request p on p.id = prr.pr_id
               where prr.status = 'pending' and p.status = 'open'
               group by prr.user_id
               having count(*) >= ${exports.REVIEWER_OVERLOAD_THRESHOLD}
           ) overloaded)::int as overloaded_reviewers,
          (select count(*) from repositories r
             where coalesce(
               greatest(
                 (select max(p.created_at) from pull_request p where p.repo_id = r.id),
                 (select max(p.merged_at)  from pull_request p where p.repo_id = r.id),
                 (select max(i.created_at) from issues i where i.repo_id = r.id)
               ),
               r.created_at
             ) < now() - interval '${QUIET_REPO_DAYS} days')::int as quiet_repos,
          (select count(distinct d.blocked_pr_id) from pr_dependencies d
             join pull_request bp on bp.id = d.blocking_pr_id
             join pull_request p on p.id = d.blocked_pr_id
             where p.status = 'open' and bp.status <> 'merged')::int as blocked_prs
      `),
            prismaClient_1.prisma.$queryRawUnsafe(`
        with activity as (${OPEN_PR_ACTIVITY})
        select a.id, a.repo_id, r.name as repo_name, a.github_pr_number, a.title,
               a.github_url, u.username as author, a.created_at, a.last_activity_at,
               extract(day from now() - a.last_activity_at)::int as days_stale,
               a.reviewer_count
        from activity a
          join repositories r on r.id = a.repo_id
          join users u on u.id = a.author_id
        where a.last_activity_at < now() - interval '${STALE_PR_DAYS} days'
        order by a.last_activity_at asc
        limit ${SECTION_LIMIT}
      `),
            // Only open PRs count: a pending request on a closed PR is noise, not
            // a queue someone actually has to work through.
            prismaClient_1.prisma.$queryRawUnsafe(`
        select u.id as user_id, u.username, u.avatar_url,
               count(*)::int as pending_count,
               extract(day from now() - min(prr.assigned_at))::int as oldest_wait_days
        from pull_request_reviewers prr
          join users u on u.id = prr.user_id
          join pull_request p on p.id = prr.pr_id
        where prr.status = 'pending' and p.status = 'open'
        group by u.id, u.username, u.avatar_url
        order by pending_count desc, oldest_wait_days desc
        limit ${SECTION_LIMIT}
      `),
            // coalesce to created_at so a repo that has never had a PR reports its
            // age rather than null, which would sort as "never quiet".
            prismaClient_1.prisma.$queryRawUnsafe(`
        select r.id, r.name, r.is_private,
               coalesce(
                 greatest(
                   (select max(p.created_at) from pull_request p where p.repo_id = r.id),
                   (select max(p.merged_at)  from pull_request p where p.repo_id = r.id),
                   (select max(i.created_at) from issues i where i.repo_id = r.id)
                 ),
                 r.created_at
               ) as last_activity_at,
               extract(day from now() - coalesce(
                 greatest(
                   (select max(p.created_at) from pull_request p where p.repo_id = r.id),
                   (select max(p.merged_at)  from pull_request p where p.repo_id = r.id),
                   (select max(i.created_at) from issues i where i.repo_id = r.id)
                 ),
                 r.created_at
               ))::int as days_quiet,
               (select count(*) from pull_request p
                  where p.repo_id = r.id and p.status = 'open')::int as open_prs
        from repositories r
        order by last_activity_at asc
        limit ${SECTION_LIMIT}
      `),
            // Blockers are rolled up with json_agg so each blocked PR arrives with
            // its blocker list attached — one query instead of a second round trip
            // per row. `filter` keeps merged blockers out of both the count and the
            // list, since a merged dependency is satisfied and not worth showing.
            prismaClient_1.prisma.$queryRawUnsafe(`
        select p.id, r.name as repo_name, p.github_pr_number, p.title, p.github_url,
               u.username as author,
               count(*) filter (where bp.status <> 'merged')::int as blocker_count,
               count(*) filter (where bp.status = 'closed')::int as abandoned_count,
               coalesce(
                 json_agg(
                   json_build_object(
                     'github_pr_number', bp.github_pr_number,
                     'repo_name', br.name,
                     'status', bp.status,
                     'github_url', bp.github_url
                   ) order by br.name, bp.github_pr_number
                 ) filter (where bp.status <> 'merged'),
                 '[]'::json
               ) as blockers
        from pr_dependencies d
          join pull_request p on p.id = d.blocked_pr_id
          join repositories r on r.id = p.repo_id
          join users u on u.id = p.author_id
          join pull_request bp on bp.id = d.blocking_pr_id
          join repositories br on br.id = bp.repo_id
        where p.status = 'open'
        group by p.id, r.name, p.github_pr_number, p.title, p.github_url, u.username
        having count(*) filter (where bp.status <> 'merged') > 0
        order by blocker_count desc, p.github_pr_number asc
        limit ${SECTION_LIMIT}
      `),
        ]);
        const s = summaryRows[0] ?? {};
        return {
            summary: {
                openPrs: s.open_prs ?? 0,
                awaitingFirstReview: s.awaiting_first_review ?? 0,
                unassignedPrs: s.unassigned_prs ?? 0,
                stalePrs: s.stale_prs ?? 0,
                overloadedReviewers: s.overloaded_reviewers ?? 0,
                quietRepos: s.quiet_repos ?? 0,
                blockedPrs: s.blocked_prs ?? 0,
            },
            stalePrs,
            reviewerLoad,
            quietRepos,
            blockedPrs,
            thresholds: {
                stalePrDays: STALE_PR_DAYS,
                quietRepoDays: QUIET_REPO_DAYS,
                reviewerOverload: exports.REVIEWER_OVERLOAD_THRESHOLD,
            },
        };
    },
};
