"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawingBoardCollaboratorsServices = void 0;
const drawingBoardCollaboratorsSB_1 = require("../supabase/drawingBoardCollaboratorsSB");
exports.DrawingBoardCollaboratorsServices = {
    async findAll() {
        return drawingBoardCollaboratorsSB_1.DrawingBoardCollaboratorsSB.findAll();
    },
    async findById(id) {
        const collab = await drawingBoardCollaboratorsSB_1.DrawingBoardCollaboratorsSB.findById(id);
        if (!collab)
            throw new Error('Board collaborator not found');
        return collab;
    },
    async create(payload) {
        return drawingBoardCollaboratorsSB_1.DrawingBoardCollaboratorsSB.create(payload);
    },
    async delete(id) {
        return drawingBoardCollaboratorsSB_1.DrawingBoardCollaboratorsSB.delete(id);
    },
};
