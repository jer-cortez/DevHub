"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { RepositoriesAPI, repositoriesKey } from "@/API/RepositoriesAPI";

export default function RepositoriesList() {
  const { data: repositories, error, isLoading, mutate } = useSWR(repositoriesKey, RepositoriesAPI.findAll);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const repositories = await RepositoriesAPI.syncFromGithub();
      mutate(repositories);
    } catch (err: any) {
      setSyncError(err.message);
    } finally {
      setSyncing(false);
    }
  };

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

      {isLoading && (
        <p className="text-sm text-neutral-500">Loading repositories...</p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
      )}

      {repositories && repositories.length === 0 && (
        <p className="text-sm text-neutral-500">No repositories found. Try syncing from GitHub.</p>
      )}

      {repositories && repositories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {repositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/dashboard/repositories/${repo.id}/code`}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-2 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{repo.name}</h3>
                <span
                  className={
                    repo.is_private
                      ? "text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                      : "text-xs rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  }
                >
                  {repo.is_private ? "Private" : "Public"}
                </span>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{repo.description}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-600">
                Default branch: {repo.default_branch}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
