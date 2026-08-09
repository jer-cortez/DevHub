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

type Tone = "neutral" | "warn" | "bad";

function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8.75-4.25v4.19l2.68 1.55a.75.75 0 0 1-.75 1.3l-3.05-1.77A.75.75 0 0 1 7.25 8.3V3.75a.75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}

function BlockedIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0Zm0 1.5a6.5 6.5 0 0 0-5.02 10.61l9.13-9.13A6.47 6.47 0 0 0 8 1.5Zm5.02 2.39-9.13 9.13A6.5 6.5 0 0 0 13.02 3.89Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M5.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 5.5c-2 0-4 1-4 2.5V13h8v-1.5C9.5 10 7.5 9 5.5 9Zm5.75-5.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 5.5c-.4 0-.8.04-1.16.12.86.6 1.41 1.4 1.41 2.38V13h3.5v-1.5c0-1.5-1.75-2.5-3.75-2.5Z" />
    </svg>
  );
}

function RepoIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}

/**
 * Header styling per tone. The header only takes on colour when the section
 * actually has something wrong in it, so scanning the page top to bottom, the
 * tinted headers *are* the summary — a healthy org reads as calm.
 */
const SECTION_TONES: Record<Tone, { header: string; icon: string; badge: string }> = {
  neutral: {
    header: "bg-neutral-50 dark:bg-neutral-900/60 border-neutral-200 dark:border-neutral-800",
    icon: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
    badge: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  warn: {
    header: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
    icon: "bg-amber-200 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
    badge: "bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200",
  },
  bad: {
    header: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    icon: "bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-300",
    badge: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200",
  },
};

function Section({
  title,
  description,
  icon,
  badge,
  tone = "neutral",
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Short status, e.g. "3 stale" — says what the number means without reading the rows. */
  badge: string;
  tone?: Tone;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  const styles = SECTION_TONES[tone];

  return (
    <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <header className={`flex items-start gap-3 px-4 py-3 border-b ${styles.header}`}>
        <span className={`shrink-0 rounded-md p-1.5 mt-0.5 ${styles.icon}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{title}</h2>
            <span
              className={`shrink-0 text-xs font-medium rounded-full px-2 py-0.5 ${styles.badge}`}
            >
              {badge}
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{description}</p>
        </div>
      </header>

      <div className="px-4 py-3">
        {isEmpty ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
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
      <div>
        <h1 className="text-xl font-semibold">Org health</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Where review is getting stuck across every repository. Section headers turn amber or red
          when that section has something needing attention, so a calm page means a healthy org.
        </p>
      </div>

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
        icon={<ClockIcon />}
        badge={stalePrs.length === 0 ? "all current" : `${stalePrs.length} stale`}
        tone={stalePrs.length > 0 ? "bad" : "neutral"}
        isEmpty={stalePrs.length === 0}
        emptyMessage="Nothing stale. Every open PR has had activity recently."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
        icon={<BlockedIcon />}
        badge={blockedPrs.length === 0 ? "none blocked" : `${blockedPrs.length} blocked`}
        tone={blockedPrs.length > 0 ? "warn" : "neutral"}
        isEmpty={blockedPrs.length === 0}
        emptyMessage="Nothing blocked. No open PR is waiting on another to merge."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
        icon={<PeopleIcon />}
        // Badge leads with the problem when there is one — how many people are
        // over the threshold matters more than how many have any queue at all.
        badge={
          summary.overloadedReviewers > 0
            ? `${summary.overloadedReviewers} overloaded`
            : reviewerLoad.length === 0
              ? "no queue"
              : `${reviewerLoad.length} reviewing`
        }
        tone={summary.overloadedReviewers > 0 ? "warn" : "neutral"}
        isEmpty={reviewerLoad.length === 0}
        emptyMessage="No pending review requests. If that looks wrong, sync a repo — reviewer data only arrives from GitHub on sync."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
        icon={<RepoIcon />}
        badge={
          summary.quietRepos > 0
            ? `${summary.quietRepos} quiet`
            : `${quietRepos.length} active`
        }
        tone={summary.quietRepos > 0 ? "warn" : "neutral"}
        isEmpty={quietRepos.length === 0}
        emptyMessage="No repositories synced yet."
      >
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
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
