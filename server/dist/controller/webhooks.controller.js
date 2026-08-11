"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const webhooks_services_1 = require("../services/webhooks.services");
exports.WebhooksController = {
    /**
     * Receives GitHub webhook deliveries. `req.body` here is a raw Buffer,
     * not parsed JSON — this route is mounted with express.raw() specifically
     * so the exact bytes GitHub signed are available for signature
     * verification (JSON.stringify(JSON.parse(body)) is not guaranteed to
     * byte-for-byte match the original body, so parsing first would break
     * signature checks).
     */
    async receive(req, res) {
        const signature = req.headers['x-hub-signature-256'];
        const rawBody = req.body;
        if (!webhooks_services_1.WebhooksServices.verifySignature(rawBody, signature)) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        const eventType = req.headers['x-github-event'];
        const payload = JSON.parse(rawBody.toString('utf-8'));
        try {
            await webhooks_services_1.WebhooksServices.handleEvent(eventType ?? '', payload);
            res.status(200).json({ received: true });
        }
        catch (error) {
            console.error('Failed to process GitHub webhook:', error);
            res.status(500).json({ error: 'Failed to process webhook' });
        }
    },
};
