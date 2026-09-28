import type { User as SupabaseUser } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({
  transaction: vi.fn(), organizations: { findMany: vi.fn() }, user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  organization_members: { findUnique: vi.fn(), create: vi.fn() }, invitations: { findFirst: vi.fn(), updateMany: vi.fn() },
}));
vi.mock('../../config/prismaClient', () => ({ prisma: { ...db, $transaction: db.transaction } }));
import { admitConfirmedEmail } from '../emailAdmission.services';
const auth = (overrides: Partial<SupabaseUser> = {}) => ({ id: '10000000-0000-4000-8000-000000000001', email: ' Person@Example.org ', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { email: 'attacker@example.org', github_id: '123' }, identities: [], ...overrides }) as SupabaseUser;
const local = { id: '20000000-0000-4000-8000-000000000001', auth_user_id: auth().id, email: 'person@example.org', github_id: null, username: 'person@example.org' };
beforeEach(() => {
  vi.resetAllMocks();
  db.transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  db.organizations.findMany.mockResolvedValue([{ id: 'org' }]);
  db.user.findUnique.mockResolvedValue(null);
  db.user.findMany.mockResolvedValue([]);
  db.user.create.mockResolvedValue(local);
  db.organization_members.findUnique.mockResolvedValue(null);
  db.invitations.findFirst.mockResolvedValue({ id: 'invite' });
  db.invitations.updateMany.mockResolvedValue({ count: 1 });
});
describe('confirmed email admission', () => {
  it('consumes a valid invitation and creates only a member, using confirmed email', async () => {
    await expect(admitConfirmedEmail(auth(), 'org')).resolves.toMatchObject({ localUser: local, email: 'person@example.org' });
    expect(db.invitations.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ email_normalized: 'person@example.org', accepted_at: null, revoked_at: null }) }));
    expect(db.organization_members.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: 'member', status: 'active', user_id: local.id }) });
    expect(db.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'person@example.org', auth_user_id: auth().id }) });
  });
  it('rejects unverified email despite editable metadata', async () => {
    await expect(admitConfirmedEmail(auth({ email_confirmed_at: undefined }), 'org')).rejects.toMatchObject({ code: 'email_unverified' });
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it.each(['expired', 'revoked', 'reused'])('rejects %s invitation when no pending valid row exists', async () => {
    db.invitations.findFirst.mockResolvedValue(null);
    await expect(admitConfirmedEmail(auth(), 'org')).rejects.toMatchObject({ code: 'invitation_required' });
    expect(db.user.create).not.toHaveBeenCalled();
  });
  it('rejects an inactive bound member even with a fresh invite', async () => {
    db.user.findUnique.mockResolvedValue(local);
    db.user.findMany.mockResolvedValue([{ id: local.id }]);
    db.organization_members.findUnique.mockResolvedValue({ role: 'member', status: 'inactive' });
    await expect(admitConfirmedEmail(auth(), 'org')).rejects.toMatchObject({ code: 'organization_membership_inactive' });
    expect(db.invitations.findFirst).not.toHaveBeenCalled();
  });
  it('allows a bound active member without consuming another invite', async () => {
    db.user.findUnique.mockResolvedValue(local);
    db.user.findMany.mockResolvedValue([{ id: local.id }]);
    db.organization_members.findUnique.mockResolvedValue({ role: 'member', status: 'active' });
    await expect(admitConfirmedEmail(auth(), 'org')).resolves.toMatchObject({ localUser: local });
    expect(db.invitations.findFirst).not.toHaveBeenCalled();
  });
  it('rejects email collisions without linking by email', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'other-user' }]);
    await expect(admitConfirmedEmail(auth(), 'org')).rejects.toMatchObject({ code: 'identity_conflict', statusCode: 409 });
    expect(db.user.create).not.toHaveBeenCalled();
  });
  it('rejects a concurrently consumed invitation', async () => {
    db.invitations.updateMany.mockResolvedValue({ count: 0 });
    await expect(admitConfirmedEmail(auth(), 'org')).rejects.toMatchObject({ code: 'invitation_conflict' });
  });
});
