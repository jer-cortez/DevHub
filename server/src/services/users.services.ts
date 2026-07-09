import { Request, Response } from  "express"; 
import { UserSB }  from "../supabase/userSB";
import type { User, Prisma } from "../generated/prisma/client";


export const UserServices = { 
    async findAll() : Promise<User[]> { 
        return UserSB.findAll()
        
    }, 
    async findById(id: string) : Promise<User> { 
        const user = await UserSB.findById(id)

        if (!user) { 
            // Change this error to a custom made error that you would call from error.ts
            throw new Error("User not found")
        }

        return user
    }, 
    async creatUser(body: Prisma.UserCreateInput) : Promise<User> { 
        const newUser = await UserSB.createUser(body); 

        if (!newUser) { 
            // Change this error to a custom made error that you would call from error.ts
            throw new Error("User could not be created")
        }

        return newUser
    }
}