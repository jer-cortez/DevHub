import type { User } from "@supabase/supabase-js";
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
    }, 
    async verifySupabaseToken(token: string): Promise<User | null>  {
        try { 
            const { data, error } = await supabaseAdmin.auth.getUser(token);

            if (error || !data.user ) { 
                return null
            };

            return data.user
        } catch { 
            return null
        }
    }
}