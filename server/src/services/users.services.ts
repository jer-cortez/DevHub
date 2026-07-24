import { UserSB } from '../supabase/userSB';
import type { User, Prisma } from '../generated/prisma/client';

export const UserServices = {
  async findAll(): Promise<User[]> {
    return UserSB.findAll();
  },
  async findById(id: string): Promise<User> {
    const user = await UserSB.findById(id);
    if (!user) throw new Error('User not found');
    return user;
  },
  async createUser(body: Prisma.UserCreateInput): Promise<User> {
    const newUser = await UserSB.createUser(body);
    if (!newUser) throw new Error('User could not be created');
    return newUser;
  },
  async delete(id: string): Promise<User> {
    return UserSB.delete(id);
  },
  async upsertByGithubId(data: {
    github_id: number;
    username: string;
    avatar_url?: string;
    email?: string;
  }): Promise<User> {
    return UserSB.upsertByGithubId(data);
  },
};
