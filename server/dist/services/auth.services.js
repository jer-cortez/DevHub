"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHandler = void 0;
const github_1 = require("../lib/github");
const supabaseClient_1 = require("../config/supabaseClient");
const ORG_NAME = process.env.GITHUB_ORG_NAME;
exports.AuthHandler = {
    async verifyOrgMembership(username, userToken) {
        try {
            const respone = await github_1.octokit.rest.orgs.checkPublicMembershipForUser({
                org: ORG_NAME,
                username
            });
            return respone.status === 204;
        }
        catch (error) {
            if (error.status === 404) {
                return false;
            }
            throw Error;
        }
    },
    async verifySupabaseToken(token) {
        try {
            const { data, error } = await supabaseClient_1.supabaseAdmin.auth.getUser(token);
            if (error || !data.user) {
                return null;
            }
            ;
            return data.user;
        }
        catch {
            return null;
        }
    }
};
