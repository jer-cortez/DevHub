import TasksPage from "@/components/Delivery/TasksPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <TasksPage repoId={id} />; }
