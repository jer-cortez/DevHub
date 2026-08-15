"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpertiseServices = void 0;
const prismaClient_1 = require("../config/prismaClient");
const pathSegments_1 = require("../lib/pathSegments");
const prDiff_services_1 = require("./prDiff.services");
const pullRequest_services_1 = require("./pullRequest.services");
const repositories_services_1 = require("./repositories.services");
/**
 * Cross-repo reviewer suggestions based on what people have actually worked
 * on, rather than who happens to be free.
 *
 * The index records which normalized path segments each person has touched,
 * in which repo, as author or reviewer. Suggestions match a PR's segments
 * against that history org-wide, so someone who refactored auth in three
 * other projects surfaces for an auth PR in a repo they've never opened.
 */
/** Authoring code is stronger evidence of expertise than reviewing it. */
const AUTHOR_WEIGHT = 2.0;
const REVIEWER_WEIGHT = 1.0;
/**
 * Recency half-life in seconds (~180 days). Expertise decays: someone who
 * touched a subsystem last month is a better reviewer than someone who
 * touched it three years ago, even if the older person touched it more.
 */
const DECAY_SECONDS = 180 * 24 * 60 * 60;
const MAX_SUGGESTIONS = 5;
exports.ExpertiseServices = {
    /**
     * Records who touched what for one PR: the author for every changed file,
     * and anyone who submitted a review.
     *
     * Idempotent via the (pr_id, user_id, file_path, role) unique key, so
     * re-running the backfill or re-syncing can't inflate someone's apparent
     * expertise.
     */
    async indexPr(prId) {
        const pr = await pullRequest_services_1.PullRequestServices.findById(prId);
        if (!pr.head_sha)
            return 0;
        const repo = await repositories_services_1.RepositoriesServices.findById(pr.repo_id);
        const paths = await prDiff_services_1.PrDiffServices.listFilePaths(repo.name, pr.github_pr_number, pr.head_sha);
        if (paths.length === 0)
            return 0;
        // Merged PRs date from the merge; anything else from creation.
        const touchedAt = pr.merged_at ?? pr.created_at;
        const reviewers = await prismaClient_1.prisma.reviews.findMany({
            where: { pr_id: prId },
            select: { reviewer_id: true },
            distinct: ['reviewer_id'],
        });
        const contributors = [
            { userId: pr.author_id, role: 'author' },
            ...reviewers
                // Someone reviewing their own PR would otherwise be double-counted.
                .filter((r) => r.reviewer_id !== pr.author_id)
                .map((r) => ({ userId: r.reviewer_id, role: 'reviewer' })),
        ];
        const rows = contributors.flatMap(({ userId, role }) => paths.map((filePath) => ({
            user_id: userId,
            repo_id: pr.repo_id,
            pr_id: prId,
            file_path: filePath,
            segments: (0, pathSegments_1.pathToSegments)(filePath),
            role,
            touched_at: touchedAt,
        })));
        // skipDuplicates makes re-indexing a no-op rather than a constraint error.
        const { count } = await prismaClient_1.prisma.file_touches.createMany({ data: rows, skipDuplicates: true });
        return count;
    },
    /**
     * Ranked reviewer suggestions for a PR.
     *
     * Excludes the PR's own author, anyone who has opted out, and the PR's own
     * touches — otherwise a PR would recommend its author on the strength of
     * the very changes under review.
     */
    async suggestReviewers(prId, limit = MAX_SUGGESTIONS) {
        const pr = await pullRequest_services_1.PullRequestServices.findById(prId);
        if (!pr.head_sha)
            return [];
        const repo = await repositories_services_1.RepositoriesServices.findById(pr.repo_id);
        const paths = await prDiff_services_1.PrDiffServices.listFilePaths(repo.name, pr.github_pr_number, pr.head_sha);
        const segments = (0, pathSegments_1.changesetSegments)(paths);
        if (segments.length === 0)
            return [];
        return prismaClient_1.prisma.$queryRawUnsafe(`
      with matched as (
        select ft.user_id, ft.repo_id, ft.pr_id, ft.role, ft.touched_at, ft.segments,
               r.name as repo_name
        from file_touches ft
          join repositories r on r.id = ft.repo_id
        where ft.segments && $1::text[]
          and ft.pr_id <> $2::uuid
          and ft.user_id <> $3::uuid
      ),
      scored as (
        select user_id,
               count(distinct repo_id)::int as repo_count,
               count(distinct pr_id)::int as pr_count,
               max(touched_at) as last_touched_at,
               array_agg(distinct repo_name) as repo_names,
               bool_and(repo_id <> $4::uuid) as is_cross_repo,
               -- Weighted by role, decayed by age. Summed over touches, so
               -- broad sustained work outranks a single old drive-by.
               sum(
                 (case when role = 'author' then ${AUTHOR_WEIGHT} else ${REVIEWER_WEIGHT} end)
                 * exp(-extract(epoch from (now() - touched_at)) / ${DECAY_SECONDS}.0)
               )::float as score
        from matched
        group by user_id
      ),
      segs as (
        select m.user_id, array_agg(distinct s order by s) as matched_segments
        from matched m, unnest(m.segments) s
        where s = any($1::text[])
        group by m.user_id
      )
      select u.id as user_id, u.username, u.avatar_url,
             sc.repo_count, sc.pr_count, sc.last_touched_at, sc.score,
             sc.repo_names, sc.is_cross_repo,
             coalesce(sg.matched_segments, '{}') as matched_segments
      from scored sc
        join users u on u.id = sc.user_id
        left join segs sg on sg.user_id = sc.user_id
      where u.allow_review_suggestions = true
      order by sc.score desc
      limit ${limit}
      `, segments, prId, pr.author_id, pr.repo_id);
    },
    /** The opt-out behind "Allow automated PR review suggestions". */
    async setSuggestionOptIn(userId, allow) {
        return prismaClient_1.prisma.user.update({
            where: { id: userId },
            data: { allow_review_suggestions: allow },
            select: { id: true, allow_review_suggestions: true },
        });
    },
    async getIndexStats() {
        const [rows] = await prismaClient_1.prisma.$queryRawUnsafe(`
      select count(*)::int as touches,
             count(distinct pr_id)::int as prs,
             count(distinct user_id)::int as users
      from file_touches
    `);
        return rows;
    },
};
