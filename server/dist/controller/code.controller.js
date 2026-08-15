"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeController = void 0;
const code_services_1 = require("../services/code.services");
const MAX_PATH_LENGTH = 4096;
const MAX_REF_LENGTH = 255;
function parsePath(raw) {
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_PATH_LENGTH)
        return null;
    return raw;
}
function parseRef(raw) {
    if (raw === undefined)
        return undefined;
    if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_REF_LENGTH)
        return null;
    return raw;
}
exports.codeController = {
    async getContents(req, res) {
        try {
            const repoId = req.params.repoId;
            const path = parsePath(req.query.path);
            const ref = parseRef(req.query.ref);
            if (path === null || ref === null) {
                res.status(400).json({ error: 'Invalid path or ref' });
                return;
            }
            const data = await code_services_1.codeServices.getContents(repoId, path, ref);
            res.status(200).json({ data });
        }
        catch (error) {
            res.status(500).json({ error: 'Fetch repo contents' });
        }
    },
    async listBranches(req, res) {
        try {
            const repoId = req.params.repoId;
            const branches = await code_services_1.codeServices.listBranches(repoId);
            res.status(200).json({ data: branches });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch branches' });
        }
    },
    async getLastCommit(req, res) {
        try {
            const repoId = req.params.repoId;
            const ref = parseRef(req.query.ref);
            if (ref === null) {
                res.status(400).json({ error: 'Invalid ref' });
                return;
            }
            const commit = await code_services_1.codeServices.getLastCommit(repoId, ref);
            res.status(200).json({ data: commit });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch last commit' });
        }
    },
};
