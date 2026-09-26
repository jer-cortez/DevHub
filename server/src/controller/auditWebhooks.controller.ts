import type { Request, Response } from 'express';
import { AuditServices } from '../services/audits.services';
import { verifyAuditWebhookSignature } from '../lib/auditWebhookSignature';

export const AuditWebhooksController = {
  async receive(req: Request, res: Response) {
    const rawBody = req.body as Buffer;
    if (!verifyAuditWebhookSignature(rawBody, req.headers['x-hub-signature-256'] as string | undefined)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
    if (req.headers['x-github-event'] !== 'pull_request') {
      res.status(200).json({ received: true });
      return;
    }
    try {
      const payload = JSON.parse(rawBody.toString('utf8'));
      await AuditServices.handlePullRequestWebhook(
        req.headers['x-github-delivery'] as string | undefined ?? '',
        payload
      );
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Failed to process audit webhook:', error);
      res.status(500).json({ error: 'Failed to process audit webhook' });
    }
  },
};
