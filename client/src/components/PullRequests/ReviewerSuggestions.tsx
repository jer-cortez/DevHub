"use client";

import { useState } from "react";
import useSWR from "swr";
import { ExpertiseAPI, reviewerSuggestionsKey } from "@/API/ExpertiseAPI";

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" className="fill-current">
      <path d="M5.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 5.5c-2 0-4 1-4 2.5V13h8v-1.5C9.5 10 7.5 9 5.5 9Zm5.75-5.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm0 5.5c-.4 0-.8.04-1.16.12.86.6 1.41 1.4 1.41 2.38V13h3.5v-1.5c0-1.5-1.75-2.5-3.75-2.5Z" />
    </svg>
  );
}

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Suggests reviewers from what people have actually worked on across every
 * repo, not who's free. Loaded on demand rather than with the PR list — it
 * costs a GitHub call for the changed files plus an index query.
 */
export default function ReviewerSuggestions({ prId }: { prId: string }) {
  const [open, setOpen] = useState(false);

  const { data, error, isLoading } = useSWR(open ? reviewerSuggestionsKey(prId) : null, () =>
    ExpertiseAPI.suggestReviewers(prId)
  );

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <PeopleIcon />
        {open ? "Hide suggested reviewers" : "Suggest reviewers"}
      </button>

      {open && (
        <div className="mt-2 rounded-md bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3">
          {isLoading && <p className="text-sm text-neutral-500">Matching against the index...</p>}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{(error as Error).message}</p>
          )}

          {data && data.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No matches yet. The index is built from merged pull requests — run the expertise
              backfill, or wait until more work has shipped in areas like this one.
            </p>
          )}

          {data && data.length > 0 && (
            <div className="space-y-2">
              {data.map((s) => (
                <div key={s.user_id} className="flex items-start gap-2">
                  {s.avatar_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatar_url} alt={s.username} className="h-6 w-6 rounded-full mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{s.username}</span>
                      {/* The whole point of the feature: someone who has never
                          touched this repo can still be the right reviewer. */}
                      {s.is_cross_repo && (
                        <span className="ml-1.5 text-xs rounded-full px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          other projects
                        </span>
                      )}
                    </p>
                    {/* Evidence, not a score — a suggestion you can't audit is
                        one nobody will trust. */}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      touched{" "}
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {s.matched_segments.slice(0, 4).join(", ")}
                      </span>{" "}
                      in {s.repo_count} repo{s.repo_count === 1 ? "" : "s"} ({s.repo_names.slice(0, 3).join(", ")})
                      · {s.pr_count} PR{s.pr_count === 1 ? "" : "s"} · last {daysAgo(s.last_touched_at)}
                    </p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-neutral-400 dark:text-neutral-600 pt-1">
                Ranked by matching work, weighted toward authorship and recent activity. People who
                opted out are never suggested.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
