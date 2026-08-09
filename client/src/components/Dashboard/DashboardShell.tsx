"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import SignOutButton from "@/components/Common/SignOutButton";
import { ChevronDownIcon, IssueIcon, PullRequestIcon } from "@/components/Common/icons";
import NotificationBell from "@/components/Notifications/NotificationBell";
import NotificationToasts from "@/components/Notifications/NotificationToasts";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { OrganizationsAPI, organizationsKey } from "@/API/OrganizationsAPI";
import { RepositoriesAPI, repositoriesKey, repositoryKey } from "@/API/RepositoriesAPI";
import { OrganizationMembersAPI, orgMembersKey } from "@/API/OrganizationMembersAPI";

type CountKey = "repositories" | "people";

interface OrgTab {
  label: string;
  href: string;
  enabled: boolean;
  countKey: CountKey | null;
}

const ORG_TABS: OrgTab[] = [
  { label: "Overview", href: "/dashboard", enabled: true, countKey: null },
  { label: "Repositories", href: "/dashboard/repositories", enabled: true, countKey: "repositories" },
  { label: "Projects", href: "#", enabled: false, countKey: null },
  { label: "Health", href: "/dashboard/health", enabled: true, countKey: null },
  { label: "Teams", href: "/dashboard/teams", enabled: true, countKey: null },
  { label: "People", href: "/dashboard/people", enabled: true, countKey: "people" },
];

function CodeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06Zm6.56 0a.75.75 0 1 0-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06Z" />
    </svg>
  );
}

function DiagramIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M2 2.75A.75.75 0 0 1 2.75 2h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75H5v2h5V7.5H9.5a.75.75 0 0 1-.75-.75v-3.5A.75.75 0 0 1 9.5 2h3.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75H11v2h.75a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 .75-.75H9v-2H5v2h.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 .75-.75H3v-2h-.5A.75.75 0 0 1 2 6.25v-3.5Z" />
    </svg>
  );
}

interface RepoTab {
  label: string;
  segment: string;
  enabled: boolean;
  // ComponentType rather than a bare `() => ReactElement` so the shared
  // icons (which take an optional `size`) and the local ones (which take
  // nothing) can both live in this list.
  icon: React.ComponentType<{ size?: number }>;
}

const REPO_TABS: RepoTab[] = [
  { label: "Code", segment: "code", enabled: true, icon: CodeIcon },
  { label: "Issues", segment: "issues", enabled: true, icon: IssueIcon },
  { label: "Pull requests", segment: "pull-requests", enabled: true, icon: PullRequestIcon },
  { label: "System Design", segment: "system-design", enabled: true, icon: DiagramIcon },
];

export default function DashboardShell({
  username,
  avatarUrl,
  children,
}: {
  username: string;
  avatarUrl?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  // When the URL is /dashboard/repositories/<id>/..., that <id> puts the
  // shell into "repo context": the org tab row and org counts are replaced
  // by the repo's own Code/Issues/PR/System Design tabs and the header
  // shows "orgname / reponame" instead of just "orgname".
  const repoId = pathname?.match(/^\/dashboard\/repositories\/([^/]+)(\/|$)/)?.[1];

  const { data: orgs } = useSWR(organizationsKey, OrganizationsAPI.findAll);
  const org = orgs?.[0] ?? null;

  const { data: repo } = useSWR(repoId ? repositoryKey(repoId) : null, () => RepositoriesAPI.findById(repoId!));
  const repoName = repo?.name ?? "";

  // org-level counts aren't shown while in repo context
  const { data: repositories } = useSWR(repoId ? null : repositoriesKey, RepositoriesAPI.findAll);
  const { data: members } = useSWR(repoId ? null : orgMembersKey, OrganizationMembersAPI.findAllWithUserInfo);
  const counts: Partial<Record<CountKey, number>> = {
    repositories: repositories?.length,
    people: members?.length,
  };

  const isActiveOrgTab = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href));

  // Matched against the segment directly after the repo id, not with
  // `pathname.includes()` — a substring test lights up two tabs at once when
  // a path happens to contain another tab's name, e.g. browsing the folder
  // `.../code/src/issues` would mark both Code and Issues active.
  const activeRepoSegment = pathname?.match(/^\/dashboard\/repositories\/[^/]+\/([^/]+)/)?.[1];
  const isActiveRepoTab = (segment: string) => activeRepoSegment === segment;

  return (
    // The provider wraps the whole shell rather than just the header,
    // because the toast stack renders at the page level too — and both need
    // to share one SSE connection.
    <NotificationsProvider>
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            {org?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.avatar_url} alt={org.name} className="h-7 w-7 rounded-full" />
            )}
            <span className="font-semibold">{org?.name ?? "Organization"}</span>
          </Link>
          {repoId && repoName && (
            <>
              <span className="text-neutral-400 dark:text-neutral-600">/</span>
              <span className="font-semibold">{repoName}</span>
              <ChevronDownIcon />
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={username} className="h-7 w-7 rounded-full" />
          )}
          <span className="text-sm">{username}</span>
          <SignOutButton />
        </div>
      </header>

      <nav className="flex gap-6 px-6 border-b border-neutral-200 dark:border-neutral-800">
        {repoId
          ? REPO_TABS.map((tab) => {
              const Icon = tab.icon;
              return tab.enabled ? (
                <Link
                  key={tab.segment}
                  href={`/dashboard/repositories/${repoId}/${tab.segment}`}
                  className={
                    isActiveRepoTab(tab.segment)
                      ? "flex items-center gap-1.5 py-3 text-sm font-semibold border-b-2 border-orange-500 text-neutral-900 dark:text-neutral-100"
                      : "flex items-center gap-1.5 py-3 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }
                >
                  <Icon size={16} />
                  {tab.label}
                </Link>
              ) : (
                <span
                  key={tab.segment}
                  className="flex items-center gap-1.5 py-3 text-sm text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                  title="Coming soon"
                >
                  <Icon size={16} />
                  {tab.label}
                </span>
              );
            })
          : ORG_TABS.map((tab) =>
              tab.enabled ? (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={
                    isActiveOrgTab(tab.href)
                      ? "flex items-center gap-2 py-3 text-sm font-semibold border-b-2 border-orange-500 text-neutral-900 dark:text-neutral-100"
                      : "flex items-center gap-2 py-3 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }
                >
                  {tab.label}
                  {tab.countKey && counts[tab.countKey] !== undefined && (
                    <span className="text-xs rounded-full px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                      {counts[tab.countKey]}
                    </span>
                  )}
                </Link>
              ) : (
                <span
                  key={tab.label}
                  className="flex items-center gap-2 py-3 text-sm text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                  title="Coming soon"
                >
                  {tab.label}
                </span>
              )
            )}
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6">{children}</main>

      <NotificationToasts />
    </div>
    </NotificationsProvider>
  );
}
