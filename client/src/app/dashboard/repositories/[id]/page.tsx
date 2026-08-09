import { redirect } from "next/navigation";

// A bare repo URL has no view of its own — Code is the landing tab, matching
// where every repo link in the app points.
export default async function RepositoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/repositories/${id}/code`);
}
