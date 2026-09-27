"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const currentUser_services_1 = require("../services/currentUser.services");
const identity_services_1 = require("../services/identity.services");
const publicUser_1 = require("../services/publicUser");
exports.AuthController = {
    async login(req, res) {
        try {
            res.status(200).json({ data: (0, publicUser_1.publicUser)(await (0, currentUser_services_1.resolveLocalUser)(req)) });
        }
        catch (error) {
            if (error instanceof identity_services_1.IdentityError) {
                res.status(error.statusCode).json({ error: error.message, code: error.code });
                return;
            }
            res.status(503).json({ error: "Failed to log in user" });
        }
    },
};
