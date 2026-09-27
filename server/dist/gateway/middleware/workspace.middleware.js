"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireWorkspaceAdmin = requireWorkspaceAdmin;
const currentUser_services_1 = require("../../services/currentUser.services");
const workspace_services_1 = require("../../services/workspace.services");
/** Applied to account/organization management, not to ordinary GitHub reads. */
async function requireWorkspaceAdmin(req, res, next) {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const user = await (0, currentUser_services_1.resolveLocalUser)(req);
        const actor = await workspace_services_1.WorkspaceServices.actorForUser(user.id);
        if (!actor.active || actor.organizationRole !== 'admin') {
            res.status(403).json({ error: 'An active organization administrator is required' });
            return;
        }
        next();
    }
    catch (error) {
        if (error instanceof workspace_services_1.WorkspaceError)
            res.status(error.status).json({ error: error.message });
        else
            res.status(503).json({ error: 'Workspace permissions are temporarily unavailable' });
    }
}
