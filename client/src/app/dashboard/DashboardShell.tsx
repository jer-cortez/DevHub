"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import { apiFetch } from "@/lib/api";

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
  { label: "People", href: "/dashboard/people", enabled: true, countKey: "people" },
];

function CodeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06Zm6.56 0a.75.75 0 1 0-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06Z" />
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

function PullRequestIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" className="fill-current">
      <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM3.5 3.25a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z" />
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

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" className="fill-current text-neutral-400 dark:text-neutral-600">
      <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

interface RepoTab {
  label: string;
  segment: string;
  enabled: boolean;
  icon: () => React.ReactElement;
}

const REPO_TABS: RepoTab[] = [
  { label: "Code", segment: "code", enabled: true, icon: CodeIcon },
  { label: "Issues", segment: "issues", enabled: false, icon: IssueIcon },
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
  const [counts, setCounts] = useState<Partial<Record<CountKey, number>>>({});
  const [org, setOrg] = useState<{ name: string; avatar_url: string } | null>(null);
  const [repoName, setRepoName] = useState("");

  // When the URL is /dashboard/repositories/<id>/..., that <id> puts the
  // shell into "repo context": the org tab row and org counts are replaced
  // by the repo's own Code/Issues/PR/System Design tabs and the header
  // shows "orgname / reponame" instead of just "orgname".
  const repoId = pathname?.match(/^\/dashboard\/repositories\/([^/]+)(\/|$)/)?.[1];

  useEffect(() => {
    apiFetch("/api/organizations/all")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok && body.data.length > 0) setOrg(body.data[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!repoId) {
      setRepoName("");
      return;
    }
    apiFetch(`/api/repositories/${repoId}`)
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setRepoName(body.data.name);
      })
      .catch(() => {});
  }, [repoId]);

  useEffect(() => {
    if (repoId) return; // org-level counts aren't shown while in repo context
    apiFetch("/api/repositories/all")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setCounts((c) => ({ ...c, repositories: body.data.length }));
      })
      .catch(() => {});

    apiFetch("/api/org-members/members")
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setCounts((c) => ({ ...c, people: body.data.length }));
      })
      .catch(() => {});
  }, [repoId]);

  const isActiveOrgTab = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href));
  const isActiveRepoTab = (segment: string) => pathname?.includes(`/${segment}`);

  return (
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
              <ChevronIcon />
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
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
                  <Icon />
                  {tab.label}
                </Link>
              ) : (
                <span
                  key={tab.segment}
                  className="flex items-center gap-1.5 py-3 text-sm text-neutral-300 dark:text-neutral-700 cursor-not-allowed"
                  title="Coming soon"
                >
                  <Icon />
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

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
