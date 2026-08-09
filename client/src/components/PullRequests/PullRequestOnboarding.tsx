"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { OnboardingAPI, onboardingKey } from "@/API/OnboardingAPI";

function CompassIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" className="fill-current">
      <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm3.2 3.3-4.3 1.6a1 1 0 0 0-.6.6L4.8 11.2l4.3-1.6a1 1 0 0 0 .6-.6l1.5-4.2ZM8 7.2a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z" />
    </svg>
  );
}

/**
 * Onboarding mode: the orientation panel a reviewer sees on a PR in a repo
 * they've never worked in.
 *
 * Renders nothing at all for people who have worked here, so it can sit
 * unconditionally in the PR list without becoming clutter for the team that
 * owns the repo. It starts collapsed to a single line rather than expanded —
 * a wall of context on every unfamiliar PR would be its own barrier.
 */
export default function PullRequestOnboarding({ prId }: { prId: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data } = useSWR(onboardingKey(prId), () => OnboardingAPI.getForPr(prId));

  if (!data?.isFirstTime) return null;

  const { areaSummary, boards, recentPrs, areaSegments, repo_name } = data;

  return (
    <div className="mt-3 rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-blue-900 dark:text-blue-200 w-full text-left"
      >
        <CompassIcon />
        New to {repo_name}? Here&apos;s some context
        <span className="ml-auto text-xs font-normal text-blue-700 dark:text-blue-300">
          {expanded ? "hide" : "show"}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {areaSegments.length > 0 && (
            <p className="text-xs text-blue-800 dark:text-blue-300">
              This PR touches:{" "}
              <span className="font-medium">{areaSegments.slice(0, 6).join(", ")}</span>
            </p>
          )}

          {areaSummary ? (
            <>
              <div>
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                  How this part of the codebase works
                </p>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                  {areaSummary.overview}
                </p>
              </div>

              {areaSummary.key_files.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                    Start by reading
                  </p>
                  <ul className="space-y-0.5">
                    {areaSummary.key_files.map((f) => (
                      <li key={f.path} className="text-sm">
                        <code className="text-xs bg-neutral-100 dark:bg-neutral-800 rounded px-1 py-0.5">
                          {f.path}
                        </code>{" "}
                        <span className="text-neutral-600 dark:text-neutral-400">— {f.role}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                  What to watch for
                </p>
                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                  {areaSummary.watch_for}
                </p>
              </div>
            </>
          ) : (
            // The rest of the panel is still useful without it, so a failed
            // model call degrades rather than hiding everything.
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No AI overview available for this area yet.
            </p>
          )}

          {recentPrs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                Recently merged here
              </p>
              <div className="space-y-1.5">
                {recentPrs.map((pr) => (
                  <div key={pr.id}>
                    <a
                      href={pr.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      #{pr.github_pr_number} {pr.title}
                    </a>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400"> by {pr.author}</span>
                    {/* Reuses the stored PR summary when one exists — no extra cost. */}
                    {pr.summary && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{pr.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {boards.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                Diagrams for this repo
              </p>
              <div className="flex flex-wrap gap-2">
                {boards.map((b) => (
                  <Link
                    key={b.id}
                    href={`/dashboard/repositories/${data.repo_id}/system-design/${b.id}`}
                    className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 hover:bg-white dark:hover:bg-neutral-800"
                  >
                    {b.title}
                    {b.matches_area && (
                      <span className="ml-1 text-blue-600 dark:text-blue-400">· relevant</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Shown because you haven&apos;t worked in this repository before. AI-generated overview —
            verify against the code.
          </p>
        </div>
      )}
    </div>
  );
}
