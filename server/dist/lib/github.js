"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.octokit = void 0;
// Loaded here rather than relying on the entry point: the token is read once,
// at module load, so whether it's set depends on import order. Until this was
// added, github.ts only worked because prismaClient.ts (which does call
// dotenv) happened to be imported first — and an importer that didn't hit
// that path got an unauthenticated Octokit that silently 404s on private
// repos instead of erroring. dotenv.config() is idempotent, so calling it in
// both places is harmless.
require("dotenv/config");
const rest_1 = require("@octokit/rest");
exports.octokit = new rest_1.Octokit({
    auth: process.env.GITHUB_APP_TOKEN,
});
