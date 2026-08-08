"use client";

import { useParams } from "next/navigation";
import CodeBrowser from "@/components/Code/CodeBrowser";

export default function CodePage() {
  const { id, path } = useParams<{ id: string; path?: string[] }>();
  const currentPath = (path ?? []).join("/");

  return <CodeBrowser repoId={id} path={currentPath} />;
}
