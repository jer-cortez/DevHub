"use client";

import Link from "next/link";
import useSWR from "swr";
import { OrganizationsAPI, organizationsKey, organizationReadmeKey } from "@/API/OrganizationsAPI";
import { RepositoriesAPI, repositoriesKey, repositoriesActivityKey, type RepoActivity } from "@/API/RepositoriesAPI";
import { OrganizationMembersAPI, orgMembersKey } from "@/API/OrganizationMembersAPI";
import { StarIcon, ForkIcon } from "@/components/Common/icons";
import ReadmeMarkdown from "@/components/Common/ReadmeMarkdown";
import NotificationsFeed from "@/components/Notifications/NotificationsFeed";
import RepoSparkline from "./RepoSparkline";
import { timeAgo } from "@/lib/timeAgo";

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Ruby: "#701516",
  Rust: "#dea584",
  "Jupyter Notebook": "#DA5B0B",
  HTML: "#e34c26",
  CSS: "#563d7c",
};

export default function OverviewContent() {
  const { data: orgs } = useSWR(organizationsKey, OrganizationsAPI.findAll);
  const org = orgs?.[0] ?? null;
  const { data: repositories = [] } = useSWR(repositoriesKey, RepositoriesAPI.findAll);
  const { data: members } = useSWR(orgMembersKey, OrganizationMembersAPI.findAllWithUserInfo);
  const memberCount = members?.length ?? null;
  const { data: readmeResult } = useSWR(organizationReadmeKey, OrganizationsAPI.getReadme);
  const { data: activity } = useSWR(
    repositories.length > 0 ? repositoriesActivityKey : null,
    RepositoriesAPI.listActivity
  );

  const activityById = new Map<string, RepoActivity>((activity ?? []).map((a) => [a.repoId, a]));

  const popularRepositories = [...repositories]
    .sort((a, b) => (activityById.get(b.id)?.stargazersCount ?? 0) - (activityById.get(a.id)?.stargazersCount ?? 0))
    .slice(0, 6);

  // Most-recently-pushed-to first; repos without activity data yet (still
  // loading) sort last rather than jumping around once it arrives.
  const repositoriesByActivity = [...repositories].sort((a, b) => {
    const aTime = activityById.get(a.id)?.pushedAt ? new Date(activityById.get(a.id)!.pushedAt!).getTime() : 0;
    const bTime = activityById.get(b.id)?.pushedAt ? new Date(activityById.get(b.id)!.pushedAt!).getTime() : 0;
    return bTime - aTime;
  });

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

      <NotificationsFeed />

      {readmeResult?.readme && (
        <div className="rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="px-4 py-2 text-sm font-medium bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
            README.md
          </div>
          <div className="p-4 text-sm leading-relaxed">
            <ReadmeMarkdown content={readmeResult.readme} />
          </div>
        </div>
      )}

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

      <div>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Repositories</h2>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border-t border-neutral-200 dark:border-neutral-800">
          {repositoriesByActivity.map((repo) => {
            const repoActivity = activityById.get(repo.id);
            return (
              <div key={repo.id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/dashboard/repositories/${repo.id}/pull-requests`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {repo.name}
                  </Link>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{repo.description}</p>
                  <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    {repoActivity?.language && (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: LANGUAGE_COLORS[repoActivity.language] ?? "#8b949e" }}
                        />
                        {repoActivity.language}
                      </span>
                    )}
                    {repoActivity && repoActivity.stargazersCount > 0 && (
                      <span className="flex items-center gap-1">
                        <StarIcon />
                        {repoActivity.stargazersCount}
                      </span>
                    )}
                    {repoActivity && repoActivity.forksCount > 0 && (
                      <span className="flex items-center gap-1">
                        <ForkIcon />
                        {repoActivity.forksCount}
                      </span>
                    )}
                    {repoActivity?.pushedAt && <span>Updated {timeAgo(repoActivity.pushedAt)}</span>}
                  </div>
                </div>
                <RepoSparkline data={repoActivity?.weeklyCommits ?? []} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
