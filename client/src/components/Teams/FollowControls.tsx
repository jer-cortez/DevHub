"use client";

import { useState } from "react";
import {
  RepoFollowersAPI,
  type FollowPreferences,
  type RepoFollow,
} from "@/API/RepoFollowersAPI";

const PREFERENCE_LABELS: { key: keyof FollowPreferences; label: string }[] = [
  { key: "notify_pull_requests", label: "Pull requests" },
  { key: "notify_issues", label: "Issues" },
  { key: "notify_comments", label: "Comments" },
];

/**
 * Follow toggle plus the per-event-type filters. Following is independent of
 * team membership: a team member already receives everything for their repo,
 * so this is for keeping a narrower eye on *other* projects.
 */
export default function FollowControls({
  repoId,
  follow,
  onChanged,
}: {
  repoId: string;
  follow: RepoFollow | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  if (!follow) {
    return (
      <button
        onClick={() => run(() => RepoFollowersAPI.follow(repoId, { notify_pull_requests: true }))}
        disabled={busy}
        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
      >
        + Follow this repository
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">Following:</span>

      {PREFERENCE_LABELS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={follow[key]}
            disabled={busy}
            onChange={(e) =>
              run(() => RepoFollowersAPI.updatePreferences(repoId, { [key]: e.target.checked }))
            }
            className="h-3 w-3 accent-orange-500"
          />
          {label}
        </label>
      ))}

      <button
        onClick={() => run(() => RepoFollowersAPI.unfollow(repoId))}
        disabled={busy}
        className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline disabled:opacity-50"
      >
        Unfollow
      </button>
    </div>
  );
}
