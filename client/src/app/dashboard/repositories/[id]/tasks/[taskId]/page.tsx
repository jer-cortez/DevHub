import TaskDetail from "@/components/Delivery/TaskDetail";
export default async function Page({ params }: { params: Promise<{ id: string; taskId: string }> }) { const { id, taskId } = await params; return <TaskDetail repoId={id} taskId={taskId} />; }
