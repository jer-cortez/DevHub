import type { ReactNode } from "react";
import CodeLayout from "@/components/Code/CodeLayout";

export default function CodeRouteLayout({ children }: { children: ReactNode }) {
  return <CodeLayout>{children}</CodeLayout>;
}
