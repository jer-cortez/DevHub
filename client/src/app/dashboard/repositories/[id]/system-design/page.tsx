"use client";

import { useParams } from "next/navigation";
import BoardsList from "@/components/SystemDesign/BoardsList";

export default function SystemDesignPage() {
  const { id } = useParams<{ id: string }>();
  return <BoardsList repoId={id} />;
}
