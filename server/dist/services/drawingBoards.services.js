"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingBoardsServices = void 0;
const drawingBoardsSB_1 = require("../supabase/drawingBoardsSB");
exports.DrawingBoardsServices = {
    async findAll() {
        return drawingBoardsSB_1.DrawingBoardsSB.findAll();
    },
    async findById(id) {
        const board = await drawingBoardsSB_1.DrawingBoardsSB.findById(id);
        if (!board)
            throw new Error('Drawing board not found');
        return board;
    },
    async create(payload) {
        return drawingBoardsSB_1.DrawingBoardsSB.create(payload);
    },
    async delete(id) {
        return drawingBoardsSB_1.DrawingBoardsSB.delete(id);
    },
    async update(id, data) {
        return drawingBoardsSB_1.DrawingBoardsSB.update(id, data);
    },
    async findByRepoId(repoId) {
        return drawingBoardsSB_1.DrawingBoardsSB.findByRepoId(repoId);
    }
};
