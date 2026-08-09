"use client";

import { useParams } from "next/navigation";
import IssuesList from "@/components/Issues/IssuesList";

export default function IssuesPage() {
  const { id } = useParams<{ id: string }>();
  return <IssuesList repoId={id} />;
}
