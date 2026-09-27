"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceController = void 0;
const currentUser_services_1 = require("../services/currentUser.services");
const workspace_services_1 = require("../services/workspace.services");
exports.WorkspaceController = {
    async mine(req, res) {
        try {
            const user = await (0, currentUser_services_1.resolveLocalUser)(req);
            const context = await workspace_services_1.WorkspaceServices.current(user.id);
            res.status(200).json({ data: {
                    user: { id: user.id, username: user.username, avatarUrl: user.avatar_url, githubConnected: user.github_id !== null },
                    ...context,
                } });
        }
        catch (error) {
            if (error instanceof workspace_services_1.WorkspaceError)
                res.status(error.status).json({ error: error.message });
            else
                res.status(503).json({ error: 'Workspace context is temporarily unavailable' });
        }
    },
};
