import type { ReactNode } from "react";
import RepositoryHeader from "@/components/Repositories/RepositoryHeader";

export default function RepositoryLayout({ children }: { children: ReactNode }) {
  return <RepositoryHeader>{children}</RepositoryHeader>;
}
