import SprintsPage from "@/components/Delivery/SprintsPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SprintsPage repoId={id} />; }
