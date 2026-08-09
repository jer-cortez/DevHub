"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { IssuesAPI, issuesKey } from "@/API/IssuesAPI";
import { ReviewCommentsAPI, issueCommentCountsKey } from "@/API/ReviewCommentsAPI";
import { useRepoEvents, type RepoEvent } from "@/hooks/useRepoEvents";
import { IssueIcon, CommentIcon } from "@/components/Common/icons";
import { timeAgo } from "@/lib/timeAgo";

type StatusFilter = "open" | "closed";

export default function IssuesList({ repoId }: { repoId: string }) {
  const {
    data: issues,
    error,
    isLoading,
    mutate: mutateIssues,
  } = useSWR(issuesKey(repoId), () => IssuesAPI.findByRepoId(repoId));

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("open");

  const issueIds = issues?.map((issue) => issue.id) ?? [];
  const { data: commentCounts = {}, mutate: mutateCommentCounts } = useSWR(
    issueCommentCountsKey(issueIds),
    () => ReviewCommentsAPI.countsByIssueIds(issueIds)
  );

  // Same live-update pattern as the PR list: the repo stream carries issue
  // and comment events, so an issue opened or closed on GitHub shows up here
  // without a refresh.
  const handleRepoEvent = useCallback(
    (event: RepoEvent) => {
      if (event.type === "issue") {
        mutateIssues();
      } else if (event.type === "comment") {
        const comment = event.data as { issue_id: string | null };
        if (!comment.issue_id) return; // PR comment, not ours to count
        mutateCommentCounts(
          (prev) => ({
            ...prev,
            [comment.issue_id!]: (prev?.[comment.issue_id!] ?? 0) + 1,
          }),
          { revalidate: false }
        );
      }
    },
    [mutateIssues, mutateCommentCounts]
  );

  useRepoEvents(repoId, handleRepoEvent);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const synced = await IssuesAPI.syncFromGithub(repoId);
      mutateIssues(synced);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const openCount = issues?.filter((i) => i.status === "open").length ?? 0;
  const closedCount = issues?.filter((i) => i.status === "closed").length ?? 0;
  const visible = issues?.filter((issue) => issue.status === filter) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-sm rounded-md px-3 py-1.5 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync from GitHub"}
        </button>
        {syncError && <p className="text-sm text-red-600 dark:text-red-400">{syncError}</p>}
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Loading issues...</p>}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>}

      {issues && (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            {(["open", "closed"] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`text-sm capitalize ${
                  filter === status
                    ? "font-semibold text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                }`}
              >
                {status === "open" ? `${openCount} Open` : `${closedCount} Closed`}
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <p className="p-4 text-sm text-neutral-500">
              {issues.length === 0
                ? "No issues found. Try syncing from GitHub."
                : `No ${filter} issues.`}
            </p>
          )}

          {visible.map((issue, i) => (
            <a
              key={issue.id}
              href={issue.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 ${
                i !== visible.length - 1
                  ? "border-b border-neutral-200 dark:border-neutral-800"
                  : ""
              }`}
            >
              <span
                className={
                  issue.status === "open"
                    ? "text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0"
                    : "text-purple-600 dark:text-purple-400 mt-0.5 shrink-0"
                }
              >
                <IssueIcon size={16} />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-medium break-words">{issue.title}</h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-0.5">
                  #{issue.github_issue_number} opened {timeAgo(issue.created_at)}
                  {issue.status === "closed" && issue.closed_at
                    ? ` · closed ${timeAgo(issue.closed_at)}`
                    : ""}
                </p>
              </div>

              {commentCounts[issue.id] > 0 && (
                <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-600 shrink-0 mt-0.5">
                  <CommentIcon />
                  {commentCounts[issue.id]}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
