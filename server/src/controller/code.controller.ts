import type { Request, Response } from "express";
import { codeServices } from "../services/code.services";

const MAX_PATH_LENGTH = 4096;
const MAX_REF_LENGTH = 255;

function parsePath(raw: unknown): string | null {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_PATH_LENGTH) return null;
    return raw;
}

function parseRef(raw: unknown): string | undefined | null {
    if (raw === undefined) return undefined;
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_REF_LENGTH) return null;
    return raw;
}

export const codeController = {
    async getContents(req: Request, res: Response) {
        try {
            const repoId  = req.params.repoId as string
            const path = parsePath(req.query.path);
            const ref = parseRef(req.query.ref);
            if (path === null || ref === null) {
                res.status(400).json({ error: 'Invalid path or ref' });
                return;
            }

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
    async getLastCommit(req: Request, res: Response) {
        try {
            const repoId = req.params.repoId as string;
            const ref = parseRef(req.query.ref);
            if (ref === null) {
                res.status(400).json({ error: 'Invalid ref' });
                return;
            }
            const commit = await codeServices.getLastCommit(repoId, ref);
            res.status(200).json({ data: commit });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch last commit' });
        }
    },
}