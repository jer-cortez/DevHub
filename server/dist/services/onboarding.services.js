"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingServices = void 0;
const prismaClient_1 = require("../config/prismaClient");
const anthropic_1 = require("../lib/anthropic");
const cache_1 = require("../lib/cache");
const pathSegments_1 = require("../lib/pathSegments");
const prDiff_services_1 = require("./prDiff.services");
const pullRequest_services_1 = require("./pullRequest.services");
const repositories_services_1 = require("./repositories.services");
const prSummary_services_1 = require("./prSummary.services");
/**
 * Onboarding mode: the curated view a reviewer gets when they open a pull
 * request in a repository they've never worked in.
 *
 * The whole point of cross-project review is that the right reviewer often
 * isn't on the project, so the cost of arriving cold is what the rest of the
 * platform keeps running into. This assembles the context a newcomer would
 * otherwise have to ask someone for: how this corner of the codebase works,
 * what shipped here recently, and which diagrams describe it.
 */
/** Boards and PRs are for orientation, not exhaustiveness — a long list is its own barrier. */
const MAX_BOARDS = 3;
const MAX_RECENT_PRS = 3;
/**
 * The area summary is keyed on the repo plus the concepts touched, not on the
 * PR, so every PR in the same area of the same repo shares one. A week is
 * long enough to make that worthwhile and short enough that it follows the
 * code as it changes.
 */
const AREA_SUMMARY_TTL_SECONDS = 7 * 24 * 60 * 60;
/** Only the dominant concepts key the cache — otherwise one stray file makes every PR unique. */
const AREA_KEY_SEGMENTS = 4;
const AREA_SCHEMA = {
    type: 'object',
    properties: {
        overview: {
            type: 'string',
            description: 'Three to five sentences explaining how this part of the codebase works: its ' +
                'responsibility, how it fits the wider system, and the shape of the code. Written for ' +
                'a competent engineer who has never opened this repository.',
        },
        key_files: {
            type: 'array',
            description: 'The three to five files worth reading first, each with a one-line reason.',
            items: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    role: { type: 'string', description: 'One line on what this file does.' },
                },
                required: ['path', 'role'],
                additionalProperties: false,
            },
        },
        watch_for: {
            type: 'string',
            description: 'Two to three sentences on what a reviewer unfamiliar with this area should scrutinise ' +
                'or could easily miss — conventions, invariants, or things that look wrong but are not.',
        },
    },
    required: ['overview', 'key_files', 'watch_for'],
    additionalProperties: false,
};
/**
 * Has this person worked in this repository before?
 *
 * "Reviewed" is deliberately broad — authoring, reviewing, or commenting all
 * count. Someone who wrote code here last month doesn't need onboarding, and
 * showing it to them would make the feature feel noisy rather than helpful.
 *
 * Raw SQL because `reviews` and `review_comments` carry a bare `pr_id` with
 * no foreign key, so Prisma has no relation to traverse from either to the
 * repository. `exists` short-circuits on the first hit, and `or` stops
 * evaluating once one is true, so the common case costs a single index probe.
 */
async function hasWorkedInRepo(userId, repoId) {
    const [row] = await prismaClient_1.prisma.$queryRawUnsafe(`
    select (
      exists(select 1 from pull_request
               where repo_id = $2::uuid and author_id = $1::uuid)
      or exists(select 1 from reviews rv
                  join pull_request p on p.id = rv.pr_id
                  where rv.reviewer_id = $1::uuid and p.repo_id = $2::uuid)
      or exists(select 1 from review_comments rc
                  join pull_request p on p.id = rc.pr_id
                  where rc.author_id = $1::uuid and p.repo_id = $2::uuid)
      or exists(select 1 from file_touches
                  where user_id = $1::uuid and repo_id = $2::uuid)
    ) as worked
    `, userId, repoId);
    return row?.worked ?? false;
}
/**
 * Ranks the repo's boards by whether their title mentions the concepts this
 * PR touches, falling back to most recently updated. A board called
 * "Auth flow" is far more use on an auth PR than whichever was edited last.
 */
async function relevantBoards(repoId, segments) {
    const boards = await prismaClient_1.prisma.drawing_boards.findMany({
        where: { repo_id: repoId },
        select: { id: true, title: true, type: true, updated_at: true },
        orderBy: { updated_at: 'desc' },
    });
    return boards
        .map((board) => ({
        ...board,
        matches_area: (0, pathSegments_1.pathToSegments)(board.title).some((token) => segments.has(token)),
    }))
        .sort((a, b) => Number(b.matches_area) - Number(a.matches_area))
        .slice(0, MAX_BOARDS);
}
async function recentlyMerged(repoId, excludePrId) {
    const prs = await prismaClient_1.prisma.pull_request.findMany({
        where: { repo_id: repoId, status: 'merged', id: { not: excludePrId } },
        orderBy: { merged_at: 'desc' },
        take: MAX_RECENT_PRS,
        select: {
            id: true,
            github_pr_number: true,
            title: true,
            github_url: true,
            merged_at: true,
            summary: true,
            author_id: true,
        },
    });
    const authors = await prismaClient_1.prisma.user.findMany({
        where: { id: { in: prs.map((pr) => pr.author_id) } },
        select: { id: true, username: true },
    });
    const usernames = new Map(authors.map((a) => [a.id, a.username]));
    return prs.map(({ author_id, ...pr }) => ({
        ...pr,
        author: usernames.get(author_id) ?? 'unknown',
    }));
}
/**
 * Explains the area of the codebase a PR touches.
 *
 * Cached across PRs that touch the same area — this is the expensive part of
 * onboarding, and two reviewers arriving at two auth PRs should not pay for
 * two identical explanations.
 */
async function areaSummary(repoId, segments, filePaths, recentTitles) {
    if (segments.length === 0)
        return null;
    const areaKey = [...segments].slice(0, AREA_KEY_SEGMENTS).sort().join('+');
    const context = await (0, prSummary_services_1.repoContext)(repoId);
    return (0, cache_1.cached)(`onboarding:area:${repoId}:${areaKey}`, AREA_SUMMARY_TTL_SECONDS, async () => {
        const response = await anthropic_1.anthropic.messages.create({
            model: anthropic_1.SUMMARY_MODEL,
            max_tokens: 8000,
            thinking: { type: 'adaptive' },
            output_config: {
                // Medium, not low. At low effort the model spends its budget on the
                // first two fields and returns an empty or placeholder `watch_for` —
                // the field a newcomer arguably needs most. Affordable here because
                // this is cached per area rather than per PR, so the cost amortizes
                // across every PR that touches the same part of the codebase.
                effort: 'medium',
                format: { type: 'json_schema', schema: AREA_SCHEMA },
            },
            system: [
                {
                    type: 'text',
                    text: 'You orient engineers who are reviewing code in a repository they have never worked ' +
                        'in. Explain how the relevant part of the system works so they can review it ' +
                        'competently. Be concrete and specific to this codebase; never pad with generic ' +
                        'software advice. Where the material genuinely does not support a field, say so in ' +
                        'plain language a reader can act on — for example "Nothing unusual here; this is a ' +
                        'small, conventional change." Never emit a placeholder, a stub, or filler text.',
                },
                // Identical for every area in this repo, so it bills at a fraction of
                // the rate after the first summary — see prSummary.services.ts.
                { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
            ],
            messages: [
                {
                    role: 'user',
                    content: `A reviewer new to this repository is about to review a change touching: ` +
                        `${segments.slice(0, 8).join(', ')}.\n\n` +
                        `Files changed:\n${filePaths.slice(0, 40).join('\n')}\n\n` +
                        (recentTitles.length > 0
                            ? `Recently merged work here, for context on direction:\n${recentTitles.join('\n')}\n\n`
                            : '') +
                        `Explain how this part of the codebase works.`,
                },
            ],
        });
        if (response.stop_reason === 'refusal') {
            throw new Error('Model declined to summarize this area');
        }
        const block = response.content.find((b) => b.type === 'text');
        if (!block || block.type !== 'text') {
            throw new Error(`No area summary returned (stop_reason: ${response.stop_reason})`);
        }
        return JSON.parse(block.text);
    });
}
exports.OnboardingServices = {
    /**
     * The onboarding view for `userId` opening `prId`. Returns
     * `isFirstTime: false` and nothing else when they've worked here before, so
     * the caller can render nothing without a second request.
     */
    async getForPr(prId, userId) {
        const pr = await pullRequest_services_1.PullRequestServices.findById(prId);
        const repo = await repositories_services_1.RepositoriesServices.findById(pr.repo_id);
        if (await hasWorkedInRepo(userId, pr.repo_id)) {
            return {
                isFirstTime: false,
                repo_id: repo.id,
                repo_name: repo.name,
                areaSegments: [],
                boards: [],
                recentPrs: [],
                areaSummary: null,
            };
        }
        const paths = pr.head_sha
            ? await prDiff_services_1.PrDiffServices.listFilePaths(repo.name, pr.github_pr_number, pr.head_sha)
            : [];
        const segments = (0, pathSegments_1.changesetSegments)(paths);
        const [boards, recentPrs] = await Promise.all([
            relevantBoards(pr.repo_id, new Set(segments)),
            recentlyMerged(pr.repo_id, prId),
        ]);
        // The orientation material is useful on its own, so a failed or refused
        // model call degrades the panel rather than failing the request.
        let summary = null;
        try {
            summary = await areaSummary(pr.repo_id, segments, paths, recentPrs.map((p) => `#${p.github_pr_number} ${p.title}`));
        }
        catch (error) {
            console.warn(`Area summary failed for PR ${prId}:`, error);
        }
        return {
            isFirstTime: true,
            repo_id: repo.id,
            repo_name: repo.name,
            areaSegments: segments.slice(0, 8),
            boards,
            recentPrs,
            areaSummary: summary,
        };
    },
};
