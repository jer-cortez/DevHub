"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeController = void 0;
const code_services_1 = require("../services/code.services");
exports.codeController = {
    async getContents(req, res) {
        try {
            const repoId = req.params.repoId;
            const path = req.query.path;
            const ref = req.query.ref;
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
            const ref = req.query.ref;
            const commit = await code_services_1.codeServices.getLastCommit(repoId, ref);
            res.status(200).json({ data: commit });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch last commit' });
        }
    },
};
