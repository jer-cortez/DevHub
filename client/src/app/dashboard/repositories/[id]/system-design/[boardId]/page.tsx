"use client";

import { useParams } from "next/navigation";
import BoardCanvas from "./BoardCanvas";

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  return <BoardCanvas boardId={boardId} />;
}
