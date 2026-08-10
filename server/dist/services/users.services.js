"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserServices = void 0;
const userSB_1 = require("../supabase/userSB");
exports.UserServices = {
    async findAll() {
        return userSB_1.UserSB.findAll();
    },
    async findById(id) {
        const user = await userSB_1.UserSB.findById(id);
        if (!user)
            throw new Error('User not found');
        return user;
    },
    async createUser(body) {
        const newUser = await userSB_1.UserSB.createUser(body);
        if (!newUser)
            throw new Error('User could not be created');
        return newUser;
    },
    async delete(id) {
        return userSB_1.UserSB.delete(id);
    },
    async upsertByGithubId(data) {
        return userSB_1.UserSB.upsertByGithubId(data);
    },
    async findByIds(ids) {
        return userSB_1.UserSB.findByIds(ids);
    },
};
