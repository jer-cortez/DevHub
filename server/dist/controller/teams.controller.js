"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsController = void 0;
const teams_services_1 = require("../services/teams.services");
const currentUser_services_1 = require("../services/currentUser.services");
exports.TeamsController = {
    /** The repo the authenticated user is currently working on, or null if they haven't joined one. */
    async findMine(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const membership = await teams_services_1.TeamsServices.findForUser(user.id);
            res.status(200).json({ data: membership });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch team membership' });
        }
    },
    async findByRepoId(req, res) {
        try {
            const members = await teams_services_1.TeamsServices.findTeamForRepo(req.params.repoId);
            res.status(200).json({ data: members });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch team' });
        }
    },
    async join(req, res) {
        try {
            const repoId = req.body?.repoId;
            if (!repoId) {
                res.status(400).json({ error: 'repoId is required' });
                return;
            }
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            // Upsert on user_id — joining a new repo replaces the previous
            // membership rather than adding a second one.
            const membership = await teams_services_1.TeamsServices.join(user.id, repoId);
            res.status(200).json({ data: membership });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to join team' });
        }
    },
    async leave(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            await teams_services_1.TeamsServices.leave(user.id);
            res.status(200).json({ data: null });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to leave team' });
        }
    },
};
