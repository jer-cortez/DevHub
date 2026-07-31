"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Organization {
  id: string;
  name: string;
  avatar_url: string;
}

interface Repository {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
}

export default function OverviewContent() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/organizations/all")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok && body.data.length > 0) setOrg(body.data[0]);
      })
      .catch(() => {});

    apiFetch("/api/repositories/all")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setRepositories(body.data);
      })
      .catch(() => {});

    apiFetch("/api/org-members/members")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setMemberCount(body.data.length);
      })
      .catch(() => {});
  }, []);

  const popularRepositories = repositories.slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        {org?.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.avatar_url} alt={org.name} className="h-16 w-16 rounded-full" />
        )}
        <div>
          <h1 className="text-xl font-semibold">{org?.name ?? "Organization"}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {repositories.length} repositories · {memberCount ?? "—"} members
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            Popular repositories
          </h2>
          <Link
            href="/dashboard/repositories"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
          </Link>
        </div>

        {popularRepositories.length === 0 && (
          <p className="text-sm text-neutral-500">
            No repositories yet. Visit the Repositories tab to sync from GitHub.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popularRepositories.map((repo) => (
            <Link
              key={repo.id}
              href={`/dashboard/repositories/${repo.id}/pull-requests`}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 space-y-1 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
