import express from 'express';
import { z } from 'zod';
import { resolveLocalUser } from '../../services/currentUser.services';
import { NativeTasksServices as service } from '../../services/nativeTasks.services';
import { WorkspaceError } from '../../services/workspace.services';
const router = express.Router();
const uuid = z.uuid();
const taskInput = z.object({ repoId: uuid, title: z.string().trim().min(1).max(300), description: z.string().max(20000).optional(), category: z.enum(['developer','designer','general']), sprintId: uuid.nullish(), assigneeId: uuid.nullish() }).strict();
const taskEdit = z.object({ title: z.string().trim().min(1).max(300).optional(), description: z.string().max(20000).nullable().optional(), category: z.enum(['developer','designer','general']).optional(), status: z.enum(['backlog','todo','in_progress','in_review','done']).optional(), sprintId: uuid.nullable().optional(), assigneeId: uuid.nullable().optional(), version: z.number().int().min(0) }).strict();
const closeInput = z.object({ choices: z.array(z.object({ taskId: uuid, action: z.enum(['backlog','carryover']), sprintId: uuid.optional() }).strict()) }).strict();
function wrap(fn: (userId: string, req: express.Request) => Promise<unknown>, schema?: z.ZodType) { return async (req: express.Request, res: express.Response) => {
  try { if (schema) req.body = schema.parse(req.body); const user = await resolveLocalUser(req); res.json({ data: await fn(user.id, req) }); }
  catch (e) { if (e instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: e.issues }); if (e instanceof WorkspaceError) return res.status(e.status).json({ error: e.message }); console.error(e); return res.status(500).json({ error: 'Internal error' }); }
}; }
router.get('/repositories/:repoId/tasks', wrap((u,r) => service.list(u, uuid.parse(r.params.repoId))));
router.post('/tasks', wrap((u,r) => service.create(u,r.body), taskInput));
router.get('/tasks/:id', wrap((u,r) => service.read(u,uuid.parse(r.params.id))));
router.patch('/tasks/:id', wrap((u,r) => service.edit(u,uuid.parse(r.params.id),r.body), taskEdit));
router.post('/tasks/:id/comments', wrap((u,r) => service.comment(u,uuid.parse(r.params.id),r.body.body), z.object({ body: z.string().trim().min(1).max(10000) }).strict()));
router.post('/tasks/:id/pr-links', wrap((u,r) => service.link(u,uuid.parse(r.params.id),r.body.prId), z.object({ prId: uuid }).strict()));
router.delete('/tasks/:id/pr-links/:prId', wrap((u,r) => service.unlink(u,uuid.parse(r.params.id),uuid.parse(r.params.prId))));
router.get('/repositories/:repoId/sprints', wrap((u,r) => service.sprints(u,uuid.parse(r.params.repoId))));
router.post('/repositories/:repoId/sprints', wrap((u,r) => service.createSprint(u,uuid.parse(r.params.repoId),r.body.name), z.object({ name: z.string().trim().min(1).max(200) }).strict()));
router.post('/sprints/:id/start', wrap((u,r) => service.startSprint(u,uuid.parse(r.params.id))));
router.post('/sprints/:id/close', wrap((u,r) => service.closeSprint(u,uuid.parse(r.params.id),r.body.choices), closeInput));
export { router as nativeTasksRouter };
