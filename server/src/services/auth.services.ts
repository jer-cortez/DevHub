import { octokit } from "../lib/github";
import { supabaseAdmin } from "../config/supabaseClient";

const ORG_NAME = process.env.GITHUB_ORG_NAME!; 

export const AuthHandler = { 
    async verifyOrgMembership(username: string, userToken: string): Promise<Boolean> { 
        try { 
        const respone = await octokit.rest.orgs.checkPublicMembershipForUser({ 
            org: ORG_NAME,
            username
        }); 
        return respone.status === 204
        } catch(error: any) { 
            if (error.status === 404) { 
                return false
            }
            throw Error
        }
    }
}