"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import { apiFetch } from "@/lib/api";

type CountKey = "repositories" | "people";

interface Tab {
  label: string;
  href: string;
  enabled: boolean;
  countKey: CountKey | null;
}

const TABS: Tab[] = [
  { label: "Overview", href: "/dashboard", enabled: true, countKey: null },
  { label: "Repositories", href: "/dashboard/repositories", enabled: true, countKey: "repositories" },
  { label: "Projects", href: "#", enabled: false, countKey: null },
  { label: "People", href: "/dashboard/people", enabled: true, countKey: "people" },
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

  useEffect(() => {
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
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <span className="font-semibold">GitHub Extension</span>
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
        {TABS.map((tab) =>
          tab.enabled ? (
            <Link
              key={tab.label}
              href={tab.href}
              className={
                isActive(tab.href)
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
