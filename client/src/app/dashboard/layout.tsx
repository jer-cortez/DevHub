import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/Dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <DashboardShell
      username={user.user_metadata.user_name}
      avatarUrl={user.user_metadata.avatar_url}
    >
      {children}
    </DashboardShell>
  );
}
