"use client";

import Link from "next/link";
import useSWR from "swr";
import { OrgHealthAPI, orgHealthKey, type OrgHealth } from "@/API/OrgHealthAPI";

/**
 * A headline number. `tone` marks the ones that represent a problem, so a
 * healthy org reads as neutral rather than a wall of alarming colour — the
 * point is that a non-zero count draws the eye.
 */
function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "neutral" | "warn" | "bad";
}) {
  const valueTone =
    value === 0
      ? "text-neutral-400 dark:text-neutral-600"
      : tone === "bad"
        ? "text-red-600 dark:text-red-400"
        : tone === "warn"
          ? "text-amber-600 dark:text-amber-500"
          : "text-neutral-900 dark:text-neutral-100";

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${valueTone}`}>{value}</p>
      {hint && <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  description,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      {isEmpty ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 p-4">
          {emptyMessage}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

export default function OrgHealthContent() {
  const { data, error, isLoading } = useSWR<OrgHealth>(orgHealthKey, () =>
    OrgHealthAPI.getDashboard()
  );

  if (isLoading) return <p className="text-sm text-neutral-500">Loading org health...</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>;
  if (!data) return null;

  const { summary, stalePrs, reviewerLoad, quietRepos, blockedPrs, thresholds } = data;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatTile label="Open PRs" value={summary.openPrs} />
        <StatTile
          label="Awaiting first review"
          value={summary.awaitingFirstReview}
          tone="warn"
          hint="Requested, none submitted"
        />
        <StatTile
          label="No reviewer"
          value={summary.unassignedPrs}
          tone="bad"
          hint="Nobody asked yet"
        />
        <StatTile
          label="Stale"
          value={summary.stalePrs}
          tone="bad"
          hint={`No activity in ${thresholds.stalePrDays}d`}
        />
        <StatTile
          label="Blocked"
          value={summary.blockedPrs}
          tone="warn"
          hint="Waiting on another PR"
        />
        <StatTile
          label="Overloaded reviewers"
          value={summary.overloadedReviewers}
          tone="warn"
          hint={`${thresholds.reviewerOverload}+ pending`}
        />
        <StatTile
          label="Quiet repos"
          value={summary.quietRepos}
          hint={`No activity in ${thresholds.quietRepoDays}d`}
        />
      </div>

      <Section
        title="Stale pull requests"
        description={`Open PRs with no review, comment, or update in over ${thresholds.stalePrDays} days — oldest first.`}
        isEmpty={stalePrs.length === 0}
        emptyMessage="Nothing stale. Every open PR has had activity recently."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
          {stalePrs.map((pr) => (
            <div key={pr.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <a
                  href={pr.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {pr.repo_name} #{pr.github_pr_number} {pr.title}
                </a>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  by {pr.author} ·{" "}
                  {pr.reviewer_count === 0
                    ? "no reviewer requested"
                    : `${pr.reviewer_count} reviewer${pr.reviewer_count === 1 ? "" : "s"} pending`}
                </p>
              </div>
              <span className="shrink-0 text-xs rounded-full px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                {pr.days_stale}d idle
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Blocked pull requests"
        description="Open PRs waiting on another PR to merge — most blockers first. These are ready work that can't move."
        isEmpty={blockedPrs.length === 0}
        emptyMessage="Nothing blocked. No open PR is waiting on another to merge."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
          {blockedPrs.map((pr) => (
            <div key={pr.id} className="py-3">
              <div className="flex items-center justify-between gap-4">
                <a
                  href={pr.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline min-w-0"
                >
                  {pr.repo_name} #{pr.github_pr_number} {pr.title}
                </a>
                <span className="shrink-0 text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {pr.blocker_count} blocker{pr.blocker_count === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {pr.blockers.map((b) => (
                  <p key={`${b.repo_name}-${b.github_pr_number}`} className="text-xs">
                    <span className="text-neutral-400 dark:text-neutral-600 font-mono mr-1.5">
                      └──
                    </span>
                    <a
                      href={b.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      #{b.github_pr_number}
                    </a>{" "}
                    <span className="text-neutral-500 dark:text-neutral-400">({b.repo_name})</span>{" "}
                    <span
                      className={
                        b.status === "closed"
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-500"
                      }
                    >
                      — {b.status === "closed" ? "closed without merging" : "not yet merged"}
                    </span>
                  </p>
                ))}
              </div>
              {/* A blocker closed without merging never resolves on its own, so
                  it needs a different call to action than "wait". */}
              {pr.abandoned_count > 0 && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {pr.abandoned_count} blocker{pr.abandoned_count === 1 ? "" : "s"} closed without
                  merging — this will never unblock itself.
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Reviewer load"
        description="Open review requests per person, and how long the oldest has been waiting."
        isEmpty={reviewerLoad.length === 0}
        emptyMessage="No pending review requests. If that looks wrong, sync a repo — reviewer data only arrives from GitHub on sync."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
          {reviewerLoad.map((r) => {
            const overloaded = r.pending_count >= thresholds.reviewerOverload;
            return (
              <div key={r.user_id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  {r.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt={r.username} className="h-6 w-6 rounded-full" />
                  )}
                  <span className="text-sm">{r.username}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    oldest {r.oldest_wait_days}d
                  </span>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ${
                      overloaded
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    {r.pending_count} pending
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Repository activity"
        description="Least recently active first. A repo with open PRs and no activity is the one to worry about."
        isEmpty={quietRepos.length === 0}
        emptyMessage="No repositories synced yet."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
          {quietRepos.map((repo) => {
            const quiet = repo.days_quiet >= thresholds.quietRepoDays;
            return (
              <div key={repo.id} className="flex items-center justify-between gap-4 py-3">
                <Link
                  href={`/dashboard/repositories/${repo.id}/code`}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {repo.name}
                </Link>
                <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>
                    {repo.open_prs} open PR{repo.open_prs === 1 ? "" : "s"}
                  </span>
                  <span className={quiet ? "text-amber-600 dark:text-amber-500" : ""}>
                    {repo.days_quiet === 0 ? "active today" : `${repo.days_quiet}d since activity`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
