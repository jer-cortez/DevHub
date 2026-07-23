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

    async handleOAuthCallback(githubUser: { 
        id: string, 
        login: string, 
        email: string | null, 
        avatar_url: string
    }) { 
        const isMember = await AuthHandler.verifyOrgMembership(githubUser.login, '')

        if (!isMember) { 
            throw new Error(
                `@${githubUser.login} is not a member of the organization`
            )
        }

        // 2. upsert user into your DB — create if new, update if returning
        const { data: user, error } = await supabaseAdmin
        .from('users')
        .upsert({
            github_id: githubUser.id,
            username: githubUser.login,
            email: githubUser.email,
            avatar_url: githubUser.avatar_url,
        }, {
            onConflict: 'github_id', // if github_id already exists, update instead of insert
        })
        .select()
        .single()

        if (error) throw new Error(error.message)

        // 3. ensure they exist in organization_members table
        await supabaseAdmin
        .from('organization_members')
        .upsert({
            user_id: user.id,
            org_name: ORG_NAME,
        }, {
            onConflict: 'user_id' 
        })

        return user
    }, 
    async revokeIfRemoved(userId: string, username: string): Promise<boolean> {
        const isMember = await AuthHandler.verifyOrgMembership(username, '')

        if (!isMember) { 
            // User not part of org any more so remove from DB
            await supabaseAdmin
            .from('organization_members')
            .delete()
            .eq('user_id', userId)

            return false 
        }

        return true 
    }
    
        
}