import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyAuditWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = process.env.AUDIT_GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
