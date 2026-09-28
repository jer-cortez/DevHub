import { Prisma } from '../generated/prisma/client';
import { prisma } from '../config/prismaClient';
import { WorkspaceError, WorkspaceServices } from './workspace.services';

export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new WorkspaceError(400, 'Invalid email');
  return normalized;
}

export const InvitationsServices = {
  async create(actorId: string, email: string, expiresAt: Date) {
    const normalized = normalizeEmail(email);
    if (!(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) throw new WorkspaceError(400, 'Expiry must be in the future');
    try { return await prisma.$transaction(async tx => {
      const actor = await WorkspaceServices.actorForUser(actorId, tx);
      if (!actor.active || actor.organizationRole !== 'admin') throw new WorkspaceError(403, 'Administrator required');
      await tx.invitations.updateMany({ where: { organization_id: actor.organizationId, email_normalized: normalized, accepted_at: null, revoked_at: null, expires_at: { lte: new Date() } }, data: { revoked_at: new Date() } });
      return tx.invitations.create({ data: { organization_id: actor.organizationId, email_normalized: normalized, invited_by: actorId, expires_at: expiresAt } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2034'].includes(error.code)) throw new WorkspaceError(409, 'Invitation already exists or changed'); throw error; }
  },
  async list(actorId: string) {
    const actor = await WorkspaceServices.actorForUser(actorId);
    if (!actor.active || actor.organizationRole !== 'admin') throw new WorkspaceError(403, 'Administrator required');
    return prisma.invitations.findMany({ where: { organization_id: actor.organizationId }, orderBy: { created_at: 'desc' } });
  },
  async revoke(actorId: string, id: string) {
    try { return await prisma.$transaction(async tx => {
      const actor = await WorkspaceServices.actorForUser(actorId, tx);
      if (!actor.active || actor.organizationRole !== 'admin') throw new WorkspaceError(403, 'Administrator required');
      const invitation = await tx.invitations.findUnique({ where: { id } });
      if (!invitation || invitation.organization_id !== actor.organizationId) throw new WorkspaceError(404, 'Invitation not found');
      if (invitation.accepted_at || invitation.revoked_at) throw new WorkspaceError(409, 'Invitation already used or revoked');
      const changed = await tx.invitations.updateMany({ where: { id, accepted_at: null, revoked_at: null }, data: { revoked_at: new Date() } });
      if (!changed.count) throw new WorkspaceError(409, 'Invitation changed');
      return { revoked: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new WorkspaceError(409, 'Invitation changed'); throw error; }
  },
};
