"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { RepositoriesAPI, repositoryKey } from "@/API/RepositoriesAPI";

export default function RepositoryHeader({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { data: repo } = useSWR(repositoryKey(id), () => RepositoriesAPI.findById(id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{repo?.name || "Repository"}</h1>
        <span className="text-xs rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-neutral-500 dark:text-neutral-400">
          {repo?.is_private ? "Private" : "Public"}
        </span>
      </div>

      {children}
    </div>
  );
}
