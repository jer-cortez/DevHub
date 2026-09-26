import type { Request, Response } from 'express';
import { AuditServiceError, AuditServices } from '../services/audits.services';
import { resolveLocalUser } from '../services/currentUser.services';

function fail(res: Response, error: unknown): void {
  if (error instanceof AuditServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error('Audit request failed:', error);
  res.status(500).json({ error: 'Audit request failed' });
}

export const AuditsController = {
  async request(req: Request, res: Response) {
    try {
      res.status(202).json({ data: await AuditServices.request(req.params.id as string) });
    } catch (error) { fail(res, error); }
  },
  async listForPr(req: Request, res: Response) {
    try {
      res.status(200).json({ data: await AuditServices.listForPr(req.params.id as string) });
    } catch (error) { fail(res, error); }
  },
  async get(req: Request, res: Response) {
    try {
      res.status(200).json({ data: await AuditServices.get(req.params.id as string) });
    } catch (error) { fail(res, error); }
  },
  async cancel(req: Request, res: Response) {
    try {
      res.status(200).json({ data: await AuditServices.cancel(req.params.id as string) });
    } catch (error) { fail(res, error); }
  },
  async feedback(req: Request, res: Response) {
    try {
      const user = await resolveLocalUser(req);
      const data = await AuditServices.feedback(
        req.params.id as string,
        req.body.finding_id,
        user.id,
        req.body.verdict
      );
      res.status(200).json({ data });
    } catch (error) { fail(res, error); }
  },
};
