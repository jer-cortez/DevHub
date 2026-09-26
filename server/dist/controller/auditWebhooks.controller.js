"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditWebhooksController = void 0;
const audits_services_1 = require("../services/audits.services");
const auditWebhookSignature_1 = require("../lib/auditWebhookSignature");
exports.AuditWebhooksController = {
    async receive(req, res) {
        const rawBody = req.body;
        if (!(0, auditWebhookSignature_1.verifyAuditWebhookSignature)(rawBody, req.headers['x-hub-signature-256'])) {
            res.status(401).json({ error: 'Invalid signature' });
            return;
        }
        if (req.headers['x-github-event'] !== 'pull_request') {
            res.status(200).json({ received: true });
            return;
        }
        try {
            const payload = JSON.parse(rawBody.toString('utf8'));
            await audits_services_1.AuditServices.handlePullRequestWebhook(req.headers['x-github-delivery'] ?? '', payload);
            res.status(200).json({ received: true });
        }
        catch (error) {
            console.error('Failed to process audit webhook:', error);
            res.status(500).json({ error: 'Failed to process audit webhook' });
        }
    },
};
