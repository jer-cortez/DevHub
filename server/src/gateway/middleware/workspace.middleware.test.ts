import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/currentUser.services', () => ({ resolveLocalUser: vi.fn() }));
vi.mock('../../services/workspace.services', () => ({
  WorkspaceServices: { actorForUser: vi.fn() },
  WorkspaceError: class extends Error { constructor(public status: number, message: string) { super(message); } },
}));
import { resolveLocalUser } from '../../services/currentUser.services';
import { WorkspaceServices } from '../../services/workspace.services';
import { requireWorkspaceAdmin } from './workspace.middleware';

function fixture(authenticated = true) {
  const req = { user: authenticated ? { id: 'supabase-id' } : undefined } as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  return { req, res, next: vi.fn() };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(resolveLocalUser).mockResolvedValue({ id: 'local-id' } as never);
});

describe('workspace admin gate', () => {
  it('rejects missing authentication', async () => {
    const { req, res, next } = fixture(false);
    await requireWorkspaceAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(resolveLocalUser).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
  it.each([
    { active: true, organizationRole: 'member' },
    { active: false, organizationRole: 'admin' },
    { active: false, organizationRole: null },
  ])('rejects non-administrators and inactive accounts: %j', async actor => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue(actor as never);
    const { req, res, next } = fixture();
    await requireWorkspaceAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it('allows only active admins and uses their stable local ID', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockResolvedValue({ active: true, organizationRole: 'admin' } as never);
    const { req, res, next } = fixture();
    await requireWorkspaceAdmin(req, res, next);
    expect(WorkspaceServices.actorForUser).toHaveBeenCalledWith('local-id');
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
  it('fails closed when the permission store is unavailable', async () => {
    vi.mocked(WorkspaceServices.actorForUser).mockRejectedValue(new Error('database unavailable'));
    const { req, res, next } = fixture();
    await requireWorkspaceAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(res.json).mock.calls)).not.toContain('database unavailable');
  });
});
