import type { User as SupabaseUser } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client';

const db = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  transaction: vi.fn(),
  findOrganizations: vi.fn(),
  findMembership: vi.fn(),
}));
const github = vi.hoisted(() => ({
  getById: vi.fn(),
  checkMembership: vi.fn(),
}));
const supabase = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('../../config/prismaClient', () => ({
  prisma: {
    user: {
      findUnique: db.findUnique,
      update: db.update,
      create: db.create,
    },
    $transaction: db.transaction,
    organizations: { findMany: db.findOrganizations },
    organization_members: { findUnique: db.findMembership },
  },
}));
vi.mock('../../lib/github', () => ({
  octokit: { rest: {
    users: { getById: github.getById },
    orgs: { checkPublicMembershipForUser: github.checkMembership },
  } },
}));
vi.mock('../../config/supabaseClient', () => ({
  supabaseAdmin: { auth: { getUser: supabase.getUser } },
}));

import {
  bindVerifiedGithubIdentity,
  githubProviderId,
  IdentityError,
  type VerifiedGithubIdentity,
} from '../identity.services';
import { AuthHandler } from '../auth.services';

function authUser(overrides: Partial<SupabaseUser> = {}): SupabaseUser {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    app_metadata: {},
    user_metadata: { provider_id: '999999', user_name: 'spoofed-login' },
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    identities: [{
      id: '12345',
      identity_id: '20000000-0000-4000-8000-000000000001',
      user_id: '10000000-0000-4000-8000-000000000001',
      provider: 'github',
      identity_data: { sub: '12345', provider_id: '12345', user_name: 'verified-login' },
    }],
    ...overrides,
  };
}

const identity: VerifiedGithubIdentity = {
  authUserId: '10000000-0000-4000-8000-000000000001',
  githubId: 12345,
  username: 'verified-login',
  avatarUrl: 'https://avatars.example/12345',
};

const localUser = {
  id: '30000000-0000-4000-8000-000000000001',
  github_id: 12345,
  auth_user_id: null,
  username: 'old-login',
  avatar_url: null,
  email: null,
  created_at: new Date(),
  allow_review_suggestions: true,
};

describe('GitHub provider identity extraction', () => {
  it('uses the provider identity and ignores spoofed user metadata', () => {
    expect(githubProviderId(authUser())).toBe(12345);
  });

  it.each([
    undefined,
    [],
    [{ id: 'abc', identity_id: 'id', user_id: 'user', provider: 'github' }],
    [{ id: '12345', identity_id: 'id', user_id: 'user', provider: 'github', identity_data: { sub: '54321' } }],
    [
      { id: '12345', identity_id: 'one', user_id: 'user', provider: 'github' },
      { id: '12345', identity_id: 'two', user_id: 'user', provider: 'github' },
    ],
  ])('rejects a missing, invalid, ambiguous, or conflicting provider identity', (identities) => {
    expect(() => githubProviderId(authUser({ identities }))).toThrow(IdentityError);
  });
});

describe('verified GitHub profile resolution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gets the authorization username from GitHub by verified numeric id', async () => {
    github.getById.mockResolvedValue({ data: {
      id: 12345,
      login: 'authoritative-login',
      avatar_url: 'https://avatars.example/12345',
      email: null,
    } });

    const resolved = await AuthHandler.resolveGithubIdentity(authUser());

    expect(github.getById).toHaveBeenCalledWith({ account_id: 12345 });
    expect(resolved.username).toBe('authoritative-login');
    expect(resolved.username).not.toBe('spoofed-login');
  });

  it('fails closed when GitHub returns a different account id', async () => {
    github.getById.mockResolvedValue({ data: {
      id: 54321,
      login: 'different-account',
      avatar_url: '',
      email: null,
    } });

    await expect(AuthHandler.resolveGithubIdentity(authUser())).rejects.toMatchObject({
      statusCode: 401,
      code: 'github_identity_invalid',
    });
  });
});

describe('shared GitHub admission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.getUser.mockResolvedValue({ data: { user: authUser() }, error: null });
    github.getById.mockResolvedValue({ data: {
      id: 12345,
      login: 'authoritative-login',
      avatar_url: 'https://avatars.example/12345',
      email: null,
    } });
    github.checkMembership.mockResolvedValue({ status: 204 });
    db.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: db.findUnique, update: db.update, create: db.create },
    }));
    db.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(localUser);
    db.update.mockResolvedValue({ ...localUser, auth_user_id: identity.authUserId });
    db.findOrganizations.mockResolvedValue([]);
  });

  it('checks and binds both identities for admission while allowing local bootstrap', async () => {
    const admitted = await AuthHandler.verifyGithubAdmission('token');

    expect(admitted.localUser.id).toBe(localUser.id);
    expect(db.findUnique).toHaveBeenCalledTimes(2);
    expect(db.findOrganizations).toHaveBeenCalledOnce();
    expect(db.findMembership).not.toHaveBeenCalled();
  });

  it('rejects an explicitly inactive local organization membership', async () => {
    db.findOrganizations.mockResolvedValue([{ id: '40000000-0000-4000-8000-000000000001' }]);
    db.findMembership.mockResolvedValue({ status: 'inactive' });

    await expect(AuthHandler.verifyGithubAdmission('token')).rejects.toMatchObject({
      statusCode: 403,
      code: 'organization_membership_inactive',
    });
  });
});

describe('verified identity binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.transaction.mockImplementation(async (callback) => callback({
      user: { findUnique: db.findUnique, update: db.update, create: db.create },
    }));
  });

  it('preserves the local id and attaches auth to a GitHub-synced user', async () => {
    db.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(localUser);
    db.update.mockResolvedValue({ ...localUser, auth_user_id: identity.authUserId });

    const result = await bindVerifiedGithubIdentity(identity);

    expect(result.id).toBe(localUser.id);
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: localUser.id },
      data: expect.objectContaining({ auth_user_id: identity.authUserId, github_id: identity.githubId }),
    }));
    expect(db.create).not.toHaveBeenCalled();
  });

  it('accepts an existing link only when both verified keys resolve to the same row', async () => {
    const linked = { ...localUser, auth_user_id: identity.authUserId };
    db.findUnique.mockResolvedValueOnce(linked).mockResolvedValueOnce(linked);
    db.update.mockResolvedValue(linked);

    await expect(bindVerifiedGithubIdentity(identity)).resolves.toEqual(linked);
    expect(db.findUnique).toHaveBeenCalledTimes(2);
  });

  it('rejects auth-account rebinding to another GitHub identity', async () => {
    db.findUnique
      .mockResolvedValueOnce({ ...localUser, github_id: 54321, auth_user_id: identity.authUserId })
      .mockResolvedValueOnce(null);

    await expect(bindVerifiedGithubIdentity(identity)).rejects.toMatchObject({
      statusCode: 409,
      code: 'identity_rebind',
    });
  });

  it('rejects a GitHub identity already linked to another auth account', async () => {
    db.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ...localUser,
      auth_user_id: '10000000-0000-4000-8000-000000000002',
    });

    await expect(bindVerifiedGithubIdentity(identity)).rejects.toMatchObject({
      statusCode: 409,
      code: 'identity_conflict',
    });
  });

  it('rejects preexisting auth and provider mappings that point to different local rows', async () => {
    db.findUnique
      .mockResolvedValueOnce({ ...localUser, id: '30000000-0000-4000-8000-000000000002', github_id: null, auth_user_id: identity.authUserId })
      .mockResolvedValueOnce(localUser);

    await expect(bindVerifiedGithubIdentity(identity)).rejects.toMatchObject({
      statusCode: 409,
      code: 'identity_conflict',
    });
  });

  it('retries a uniqueness race and rechecks both mappings', async () => {
    const race = new Prisma.PrismaClientKnownRequestError('unique race', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const linked = { ...localUser, auth_user_id: identity.authUserId };
    db.transaction
      .mockRejectedValueOnce(race)
      .mockImplementationOnce(async (callback) => callback({
        user: { findUnique: db.findUnique, update: db.update, create: db.create },
      }));
    db.findUnique.mockResolvedValueOnce(linked).mockResolvedValueOnce(linked);
    db.update.mockResolvedValue(linked);

    await expect(bindVerifiedGithubIdentity(identity)).resolves.toEqual(linked);
    expect(db.transaction).toHaveBeenCalledTimes(2);
    expect(db.findUnique).toHaveBeenCalledTimes(2);
  });
});
