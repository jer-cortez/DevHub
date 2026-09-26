"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditOctokit = getAuditOctokit;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const rest_1 = require("@octokit/rest");
let cached;
function base64url(value) {
    return Buffer.from(value).toString('base64url');
}
async function appJwt() {
    const appId = process.env.AUDIT_GITHUB_APP_ID;
    const keyPath = process.env.AUDIT_GITHUB_PRIVATE_KEY_PATH;
    if (!appId || !keyPath)
        throw new Error('GitHub App credentials are not configured');
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
    const unsigned = `${header}.${payload}`;
    const signer = (0, node_crypto_1.createSign)('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const privateKey = await (0, promises_1.readFile)(keyPath, 'utf8');
    return `${unsigned}.${signer.sign(privateKey).toString('base64url')}`;
}
async function getAuditOctokit() {
    if (cached && cached.expiresAt - Date.now() > 60000)
        return new rest_1.Octokit({ auth: cached.token });
    const installationId = process.env.AUDIT_GITHUB_INSTALLATION_ID;
    if (!installationId)
        throw new Error('AUDIT_GITHUB_INSTALLATION_ID is not configured');
    const app = new rest_1.Octokit({ auth: await appJwt() });
    const response = await app.rest.apps.createInstallationAccessToken({ installation_id: Number(installationId) });
    cached = { token: response.data.token, expiresAt: Date.parse(response.data.expires_at) };
    return new rest_1.Octokit({ auth: cached.token });
}
