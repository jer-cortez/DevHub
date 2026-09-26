"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuditWebhookSignature = verifyAuditWebhookSignature;
const node_crypto_1 = require("node:crypto");
function verifyAuditWebhookSignature(rawBody, signature) {
    const secret = process.env.AUDIT_GITHUB_WEBHOOK_SECRET;
    if (!secret || !signature)
        return false;
    const expected = Buffer.from(`sha256=${(0, node_crypto_1.createHmac)('sha256', secret).update(rawBody).digest('hex')}`);
    const actual = Buffer.from(signature);
    return expected.length === actual.length && (0, node_crypto_1.timingSafeEqual)(expected, actual);
}
