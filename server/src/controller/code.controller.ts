import type { Request, Response } from "express";
import { codeServices } from "../services/code.services";

export const codeController = {
    async getContents(req: Request, res: Response) {
        try {
            const repoId  = req.params.repoId as string
            const path = req.query.path as string;
            const ref = req.query.ref as string | undefined;

            const data = await codeServices.getContents(repoId, path, ref);

            res.status(200).json({ data })
        } catch (error) {
            res.status(500).json({ error: 'Fetch repo contents' })
        }
    },
    async listBranches(req: Request, res: Response) {
        try {
            const repoId = req.params.repoId as string;
            const branches = await codeServices.listBranches(repoId);
            res.status(200).json({ data: branches });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch branches' });
        }
    },
}