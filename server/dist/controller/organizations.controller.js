"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationsController = void 0;
const organizations_services_1 = require("../services/organizations.services");
exports.OrganizationsController = {
    async findAll(_req, res) {
        try {
            const orgs = await organizations_services_1.OrganizationsServices.findAll();
            res.status(200).json({ data: orgs });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch organizations' });
        }
    },
    async findById(req, res) {
        try {
            const id = req.params.id;
            const org = await organizations_services_1.OrganizationsServices.findById(id);
            res.status(200).json({ data: org });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch organization' });
        }
    },
    async create(req, res) {
        try {
            const org = await organizations_services_1.OrganizationsServices.create(req.body);
            res.status(201).json({ data: org });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create organization' });
        }
    },
    async delete(req, res) {
        try {
            const id = req.params.id;
            await organizations_services_1.OrganizationsServices.delete(id);
            res.status(200).json({ message: 'Organization deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete organization' });
        }
    },
    async getReadme(_req, res) {
        try {
            const readme = await organizations_services_1.OrganizationsServices.getReadme();
            res.status(200).json({ data: { readme } });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch organization README' });
        }
    },
};
