import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../../config/supabaseClient";

export const AuthMiddleware = async (
    req: Request, 
    res: Response, 
    next: NextFunction
 ) : Promise<void> => { 

    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) { 
        res.status(401).json({ error : "No Token Provided"});
        return
    }

    const { data , error } = await supabaseAdmin.auth.getUser(token);

    if ( error || !data.user) { 
        console.error('Error verifying token:', error);
        res.status(401).json({ error : "Invaild or expired token" });
        return
    }
    // Potential add req.user ... to attach user to request for downstream use
    next()

}