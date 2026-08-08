"use client";

import { useParams } from "next/navigation";
import PullRequestsList from "@/components/PullRequests/PullRequestsList";

export default function PullRequestsPage() {
  const { id } = useParams<{ id: string }>();
  return <PullRequestsList repoId={id} />;
}
