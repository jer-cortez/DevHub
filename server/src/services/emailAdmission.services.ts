import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Prisma, type User as LocalUser } from '../generated/prisma/client';
import { prisma } from '../config/prismaClient';
import { IdentityError } from './identity.services';
import { normalizeEmail } from './invitations.services';

export async function admitConfirmedEmail(user: SupabaseUser, organizationName: string): Promise<{ localUser: LocalUser; email: string }> {
  // Supabase's confirmed email is authoritative; user_metadata is user-editable.
  if (!user.email || !user.email_confirmed_at) throw new IdentityError('A confirmed email is required', 403, 'email_unverified');
  let email: string;
  try { email = normalizeEmail(user.email); }
  catch { throw new IdentityError('A valid confirmed email is required', 403, 'email_invalid'); }
  try { return await prisma.$transaction(async tx => {
    const organizations = await tx.organizations.findMany({ where: { name: { equals: organizationName, mode: 'insensitive' } }, select: { id: true }, take: 2 });
    if (organizations.length !== 1) throw new IdentityError('Workspace organization is unavailable', 503, 'workspace_unavailable');
    const organizationId = organizations[0].id;
    const bound = await tx.user.findUnique({ where: { auth_user_id: user.id } });
    const emailMatches = await tx.user.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
    // Never claim a GitHub-synced or another auth account from an email match.
    if (emailMatches.some(match => match.id !== bound?.id)) throw new IdentityError('Email belongs to another local account', 409, 'identity_conflict');
    const membership = bound && await tx.organization_members.findUnique({ where: { user_id_org_id: { user_id: bound.id, org_id: organizationId } } });
    if (membership && (membership.status !== 'active' || !['admin','member'].includes(membership.role))) throw new IdentityError('Organization membership is inactive', 403, 'organization_membership_inactive');
    if (membership?.status === 'active') return { localUser: bound!, email };
    const invitation = await tx.invitations.findFirst({ where: { organization_id: organizationId, email_normalized: email, accepted_at: null, revoked_at: null, expires_at: { gt: new Date() } }, orderBy: { created_at: 'desc' } });
    if (!invitation) throw new IdentityError('A valid invitation is required', 403, 'invitation_required');
    if (bound && membership) throw new IdentityError('Organization membership is inactive', 403, 'organization_membership_inactive');
    const localUser = bound ?? await tx.user.create({ data: { auth_user_id: user.id, username: email, email } });
    const consumed = await tx.invitations.updateMany({ where: { id: invitation.id, accepted_at: null, revoked_at: null, expires_at: { gt: new Date() } }, data: { accepted_auth_user_id: user.id, accepted_at: new Date() } });
    if (!consumed.count) throw new IdentityError('Invitation already used', 409, 'invitation_conflict');
    await tx.organization_members.create({ data: { user_id: localUser.id, org_id: organizationId, role: 'member', status: 'active', joined_at: new Date() } });
    return { localUser, email };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  catch (error) {
    if (error instanceof IdentityError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2034'].includes(error.code)) throw new IdentityError('Admission changed concurrently', 409, 'admission_conflict');
    throw new IdentityError('Email admission is temporarily unavailable', 503, 'workspace_unavailable');
  }
}
