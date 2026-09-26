import { afterEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { auditProfileSchema, profileVersion } from '../auditProfiles.services';
import { verifyAuditWebhookSignature } from '../../lib/auditWebhookSignature';

const validProfile = {
  version: '1',
  node_image: 'devhub-audit-node:22',
  projects: [{
    directory: '.',
    checks: [{ name: 'test', argv: ['npm', 'test', '--', '--runInBand'] }],
    rebuild: [{ name: 'native dependencies', argv: ['npm', 'rebuild'] }],
  }],
  enabled: true,
};

describe('audit profile validation', () => {
  it('accepts a bounded argv profile and creates a stable version across key order', () => {
    const parsed = auditProfileSchema.parse(validProfile);
    const reordered = auditProfileSchema.parse({
      enabled: true,
      projects: validProfile.projects,
      node_image: validProfile.node_image,
      version: validProfile.version,
    });
    expect(profileVersion(parsed)).toBe(profileVersion(reordered));
    expect(profileVersion(parsed)).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each(['/tmp/project', '../project', 'src/../../secret', 'src\\..\\secret'])(
    'rejects unsafe project directory %s',
    (directory) => {
      expect(() => auditProfileSchema.parse({
        ...validProfile,
        projects: [{ ...validProfile.projects[0], directory }],
      })).toThrow();
    }
  );

  it('rejects shell-shaped commands in place of argv arrays', () => {
    expect(() => auditProfileSchema.parse({
      ...validProfile,
      projects: [{ ...validProfile.projects[0], checks: [{ name: 'test', argv: 'npm test; curl evil' }] }],
    })).toThrow();
  });
});

describe('audit webhook signature verification', () => {
  const original = process.env.AUDIT_GITHUB_WEBHOOK_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.AUDIT_GITHUB_WEBHOOK_SECRET;
    else process.env.AUDIT_GITHUB_WEBHOOK_SECRET = original;
  });

  it('accepts the exact body signed with the configured secret and rejects tampering', () => {
    process.env.AUDIT_GITHUB_WEBHOOK_SECRET = 'test-secret';
    const body = Buffer.from('{"action":"opened"}');
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(body).digest('hex')}`;
    expect(verifyAuditWebhookSignature(body, signature)).toBe(true);
    expect(verifyAuditWebhookSignature(Buffer.from('{"action":"closed"}'), signature)).toBe(false);
    expect(verifyAuditWebhookSignature(body, 'sha256=short')).toBe(false);
  });
});
