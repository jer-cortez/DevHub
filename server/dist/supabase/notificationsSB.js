"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsSB = void 0;
const prismaClient_1 = require("../config/prismaClient");
exports.NotificationsSB = {
    async findAll() {
        return prismaClient_1.prisma.notifications.findMany();
    },
    async findById(id) {
        return prismaClient_1.prisma.notifications.findUnique({ where: { id } });
    },
    async create(payload) {
        return prismaClient_1.prisma.notifications.create({ data: payload });
    },
    async delete(id) {
        return prismaClient_1.prisma.notifications.delete({ where: { id } });
    },
};
