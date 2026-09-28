import type { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../../services/currentUser.services', () => ({ resolveLocalUser: vi.fn() }));
vi.mock('../../services/invitations.services', () => ({ InvitationsServices: { create: vi.fn(), list: vi.fn(), revoke: vi.fn() } }));
import { invitationsRouter } from './invitations.routes';
import { InvitationsServices } from '../../services/invitations.services';
import { resolveLocalUser } from '../../services/currentUser.services';
import { WorkspaceError } from '../../services/workspace.services';
import { requireWorkspaceAdmin } from '../middleware/workspace.middleware';
const handler = (method: string) => (invitationsRouter as any).stack.find((layer: any) => layer.route?.methods?.[method]).route.stack[0].handle;
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as unknown as Response;
beforeEach(() => { vi.resetAllMocks(); vi.mocked(resolveLocalUser).mockResolvedValue({ id: 'admin' } as never); });
it('places admin authorization before invitation routes', () => {
  expect((invitationsRouter as any).stack[0].handle).toBe(requireWorkspaceAdmin);
});
it('rejects malformed invitation bodies with 400', async () => {
  const res = response();
  await handler('post')({ body: { email: 'invalid', expiresAt: 'yesterday' } } as Request, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(InvitationsServices.create).not.toHaveBeenCalled();
});
it.each([403, 409])('returns %i from invitation authorization or collisions', async status => {
  vi.mocked(InvitationsServices.create).mockRejectedValue(new WorkspaceError(status, 'Rejected'));
  const res = response();
  await handler('post')({ body: { email: 'person@example.org', expiresAt: '2027-01-01T00:00:00Z' } } as Request, res);
  expect(res.status).toHaveBeenCalledWith(status);
});
it('does not expose accepted auth UUID in invitation responses', async () => {
  vi.mocked(InvitationsServices.create).mockResolvedValue({ id: 'invite', accepted_auth_user_id: 'private-auth-uuid' } as never);
  const res = response();
  await handler('post')({ body: { email: 'person@example.org', expiresAt: '2027-01-01T00:00:00Z' } } as Request, res);
  expect(res.json).toHaveBeenCalledWith({ data: { id: 'invite' } });
});
