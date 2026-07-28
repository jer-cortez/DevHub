"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

const TABS = [
  { label: "Code", segment: "code", enabled: false },
  { label: "Issues", segment: "issues", enabled: false },
  { label: "Pull Requests", segment: "pull-requests", enabled: true },
];

export default function RepositoryLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");

  useEffect(() => {
    apiFetch(`/api/repositories/${id}`)
      .then(async (res) => {
        const body = await res.json();
        if (res.ok) setName(body.data.name);
      })
      .catch(() => {});
  }, [id]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{name || "Repository"}</h1>

      <div className="flex gap-4 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((tab) =>
          tab.enabled ? (
            <Link
              key={tab.segment}
              href={`/dashboard/repositories/${id}/${tab.segment}`}
              className="px-1 pb-2 text-sm font-medium border-b-2 border-neutral-900 dark:border-neutral-100"
            >
              {tab.label}
            </Link>
          ) : (
            <span
              key={tab.segment}
              className="px-1 pb-2 text-sm text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
              title="Coming soon"
            >
              {tab.label}
            </span>
          )
        )}
      </div>

      {children}
    </div>
  );
}
