import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Octokit } from '@octokit/rest';

let cached: { token: string; expiresAt: number } | undefined;

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

async function appJwt(): Promise<string> {
  const appId = process.env.AUDIT_GITHUB_APP_ID;
  const keyPath = process.env.AUDIT_GITHUB_PRIVATE_KEY_PATH;
  if (!appId || !keyPath) throw new Error('GitHub App credentials are not configured');
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const privateKey = await readFile(keyPath, 'utf8');
  return `${unsigned}.${signer.sign(privateKey).toString('base64url')}`;
}

export async function getAuditOctokit(): Promise<Octokit> {
  if (cached && cached.expiresAt - Date.now() > 60_000) return new Octokit({ auth: cached.token });
  const installationId = process.env.AUDIT_GITHUB_INSTALLATION_ID;
  if (!installationId) throw new Error('AUDIT_GITHUB_INSTALLATION_ID is not configured');
  const app = new Octokit({ auth: await appJwt() });
  const response = await app.rest.apps.createInstallationAccessToken({ installation_id: Number(installationId) });
  cached = { token: response.data.token, expiresAt: Date.parse(response.data.expires_at) };
  return new Octokit({ auth: cached.token });
}
