// Loaded here rather than relying on the entry point: the token is read once,
// at module load, so whether it's set depends on import order. Until this was
// added, github.ts only worked because prismaClient.ts (which does call
// dotenv) happened to be imported first — and an importer that didn't hit
// that path got an unauthenticated Octokit that silently 404s on private
// repos instead of erroring. dotenv.config() is idempotent, so calling it in
// both places is harmless.
import 'dotenv/config'
import { Octokit } from "@octokit/rest"

export const octokit = new Octokit({
  auth: process.env.GITHUB_APP_TOKEN,
})