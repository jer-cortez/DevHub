import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const createClient = async () => {
    const cookieStore = await cookies(); 

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

    if (!supabaseUrl || !supabaseKey) { 
        throw new Error('Missing supabse environment variables')
    };

    return createServerClient(supabaseUrl, supabaseKey,
        {
            cookies: { 
                getAll: () => cookieStore.getAll(), 
                setAll: (cookiesToSet) => 
                    cookiesToSet.forEach(({ name, value, options }) => 
                    cookieStore.set(name, value, options))
            }
        }
    )
 
};