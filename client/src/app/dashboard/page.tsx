import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "./DashboardShell";
import RepositoriesList from "./RepositoriesList";

export default async function DashboardPage() {
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
      <h1 className="text-lg font-semibold mb-4">Repositories</h1>
      <RepositoriesList />
    </DashboardShell>
  );
}
