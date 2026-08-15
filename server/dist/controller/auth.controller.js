"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const users_services_1 = require("../services/users.services");
exports.AuthController = {
    async login(req, res) {
        try {
            const { username, email, avatar_url, github_id } = req.user;
            const user = await users_services_1.UserServices.upsertByGithubId({
                github_id,
                username,
                avatar_url,
                email,
            });
            res.status(200).json({ data: user });
        }
        catch (error) {
            res.status(500).json({ error: "Failed to log in user" });
        }
    },
};
