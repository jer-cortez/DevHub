"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationMembersController = void 0;
const organizationMembers_services_1 = require("../services/organizationMembers.services");
exports.OrganizationMembersController = {
    async findAll(_req, res) {
        try {
            const members = await organizationMembers_services_1.OrganizationMembersServices.findAll();
            res.status(200).json({ data: members });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch organization members' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const member = await organizationMembers_services_1.OrganizationMembersServices.findById(id);
            res.status(200).json({ data: member });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch organization member' });
        }
    },
    async create(req, res) {
        try {
            const member = await organizationMembers_services_1.OrganizationMembersServices.create(req.body);
            res.status(201).json({ data: member });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create organization member' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await organizationMembers_services_1.OrganizationMembersServices.delete(id);
            res.status(200).json({ message: 'Organization member deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete organization member' });
        }
    },
    async findAllWithUserInfo(_req, res) {
        try {
            const members = await organizationMembers_services_1.OrganizationMembersServices.findAllWithUserInfo();
            res.status(200).json({ data: members });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch organization members' });
        }
    },
    async sync(_req, res) {
        try {
            const members = await organizationMembers_services_1.OrganizationMembersServices.syncFromGithub();
            res.status(200).json({ data: members });
        }
        catch (error) {
            console.error('Failed to sync organization members from GitHub:', error);
            res.status(500).json({ error: 'Failed to sync organization members' });
        }
    },
};
