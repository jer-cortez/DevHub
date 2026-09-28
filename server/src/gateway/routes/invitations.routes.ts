import express from 'express';
import { z } from 'zod';
import { requireWorkspaceAdmin } from '../middleware/workspace.middleware';
import { resolveLocalUser } from '../../services/currentUser.services';
import { InvitationsServices } from '../../services/invitations.services';
import { WorkspaceError } from '../../services/workspace.services';
const router = express.Router();
router.use(requireWorkspaceAdmin);
router.get('/', async (req, res) => {
  try { res.json({ data: (await InvitationsServices.list((await resolveLocalUser(req)).id)).map(publicInvitation) }); }
  catch (error) { respond(res, error); }
});
router.post('/', async (req, res) => {
  const parsed = z.strictObject({ email: z.email(), expiresAt: z.iso.datetime({ offset: true }) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Valid email and expiry are required' }); return; }
  try { res.status(201).json({ data: publicInvitation(await InvitationsServices.create((await resolveLocalUser(req)).id, parsed.data.email, new Date(parsed.data.expiresAt))) }); }
  catch (error) { respond(res, error); }
});
router.delete('/:id', async (req, res) => {
  if (!z.uuid().safeParse(req.params.id).success) { res.status(400).json({ error: 'Invalid invitation ID' }); return; }
  try { res.json({ data: await InvitationsServices.revoke((await resolveLocalUser(req)).id, String(req.params.id)) }); }
  catch (error) { respond(res, error); }
});
function publicInvitation<T extends { accepted_auth_user_id: string | null }>(invitation: T): Omit<T, 'accepted_auth_user_id'> {
  const { accepted_auth_user_id: _authId, ...record } = invitation;
  return record;
}
function respond(res: express.Response, error: unknown) {
  if (error instanceof WorkspaceError) res.status(error.status).json({ error: error.message });
  else res.status(503).json({ error: 'Invitation service unavailable' });
}
export { router as invitationsRouter };
