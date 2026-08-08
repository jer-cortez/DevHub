"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RepositoriesAPI } from "@/API/RepositoriesAPI";

export default function RepositoryHeader({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    RepositoriesAPI.findById(id)
      .then((repo) => {
        setName(repo.name);
        setIsPrivate(repo.is_private);
      })
      .catch(() => {});
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{name || "Repository"}</h1>
        <span className="text-xs rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-neutral-500 dark:text-neutral-400">
          {isPrivate ? "Private" : "Public"}
        </span>
      </div>

      {children}
    </div>
  );
}
