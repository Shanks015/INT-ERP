import Partner from '../models/Partner.js';
import { Parser } from 'json2csv';
import { logUserActivity, sanitizeInput, escapeRegex } from './generic.controller.js';
import { activeCondition, expiredCondition, isExpiredValue, mergeConditions } from '../utils/recordExpiry.js';

// dd/MMM/yyyy formatter (project standard; see ScholarInResidence model).
const fmtDDMMM = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
};

// Get all partners
export const getAll = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            country,
            mouStatus,
            agreementType,
            recordStatus,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        let query = {};

        // Search
        if (search && search.trim()) {
            const searchRegex = { $regex: escapeRegex(search.trim()), $options: 'i' };
            query.$or = [
                { university: searchRegex },
                { school: searchRegex },
                { country: searchRegex },
                { contactPerson: searchRegex },
                { agreementType: searchRegex }
            ];
        }

        // Filters
        if (country && country !== 'all') query.country = { $regex: escapeRegex(country), $options: 'i' };
        // mouStatus/agreementType: case-insensitive exact match so legacy casing and
        // the case-insensitive-deduped option lists on the client always agree.
        if (mouStatus && mouStatus !== 'all') query.mouStatus = { $regex: `^${escapeRegex(mouStatus)}$`, $options: 'i' };
        if (agreementType && agreementType !== 'all') query.agreementType = { $regex: `^${escapeRegex(agreementType)}$`, $options: 'i' };

        // recordStatus (active/expired) — derived from expiringDate at read time
        // (stored value only refreshes in pre('save'), so imported/idle partners
        // go stale; see utils/recordExpiry.js).
        if (recordStatus && recordStatus !== 'all') {
            const cond = recordStatus.toLowerCase() === 'expired'
                ? expiredCondition('expiringDate')
                : recordStatus.toLowerCase() === 'active' ? activeCondition('expiringDate') : null;
            if (cond) query = mergeConditions(query, cond);
        }

        // Date window on signingDate (task #66): filter partners whose MoU was
        // signed inside the chosen From/To range. Single field, end-of-day bound.
        if (startDate || endDate) {
            query.signingDate = {};
            if (startDate) query.signingDate.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.signingDate.$lte = end;
            }
        }

        // Calculate pagination
        const skip = (page - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query. createdBy/updatedBy are populated so My Requests can
        // match a user's own pending items by email (getAll feeds that page).
        const [partners, total] = await Promise.all([
            Partner.find(query)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Partner.countDocuments(query)
        ]);

        // Derive each returned doc's recordStatus from expiringDate (serialization
        // only — see utils/recordExpiry.js). lean() docs are plain objects.
        partners.forEach(p => {
            p.recordStatus = isExpiredValue(p.expiringDate) ? 'expired' : 'active';
        });

        res.json({
            success: true,
            data: partners,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching partners',
            error: error.message
        });
    }
};

// Get partner by ID
export const getById = async (req, res) => {
    try {
        const partner = await Partner.findById(req.params.id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Partner not found'
            });
        }
        // Same read-time derivation as getAll (serialization-only).
        partner.recordStatus = isExpiredValue(partner.expiringDate) ? 'expired' : 'active';
        res.json({ success: true, data: partner });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching partner',
            error: error.message
        });
    }
};

// Create partner
export const create = async (req, res) => {
    try {
        const partner = new Partner({
            ...sanitizeInput(req.body),
            createdBy: req.userId,
            status: 'active'
        });
        await partner.save();

        // Log partner creation activity
        await logUserActivity(req, 'create', 'Partner', partner);

        res.status(201).json({
            success: true,
            message: 'Partner created successfully',
            data: partner
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating partner',
            error: error.message
        });
    }
};

// Update partner
export const update = async (req, res) => {
    try {
        const partner = await Partner.findById(req.params.id);

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Partner not found'
            });
        }

        // Check if partner is already pending
        if (partner.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit a partner that has pending changes'
            });
        }

        // Admin can directly update
        if (req.user.role === 'admin') {
            Object.assign(partner, sanitizeInput(req.body));
            partner.updatedBy = req.userId;
            await partner.save();

            // Log admin partner update activity
            await logUserActivity(req, 'update', 'Partner', partner);

            return res.json({
                success: true,
                message: 'Partner updated successfully',
                data: partner
            });
        }

        // Employee/Intern creates pending edit
        partner.status = 'pending_edit';
        partner.pendingChanges = sanitizeInput(req.body);
        partner.updatedBy = req.userId;
        await partner.save();

        // Log employee staged partner update activity
        await logUserActivity(req, 'update', 'Partner', partner);

        res.json({
            success: true,
            message: 'Edit request submitted for approval',
            data: partner
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating partner',
            error: error.message
        });
    }
};

// Delete partner
export const remove = async (req, res) => {
    try {
        const { reason } = req.body;
        const partner = await Partner.findById(req.params.id);

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Partner not found'
            });
        }

        // Check if partner is already pending
        if (partner.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a partner that has pending changes'
            });
        }

        // Admin can directly delete
        if (req.user.role === 'admin') {
            await Partner.findByIdAndDelete(req.params.id);

            // Log admin partner delete activity
            await logUserActivity(req, 'delete', 'Partner', partner);

            return res.json({
                success: true,
                message: 'Partner deleted successfully'
            });
        }

        // Employee/Intern creates pending delete
        partner.status = 'pending_delete';
        partner.deletionReason = reason || '';
        partner.updatedBy = req.userId;
        await partner.save();

        // Log employee staged partner delete activity
        await logUserActivity(req, 'delete', 'Partner', partner);

        res.json({
            success: true,
            message: 'Delete request submitted for approval',
            data: partner
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting partner',
            error: error.message
        });
    }
};

// Get pending counts/all for Partners
export const getPendingCount = async (req, res) => {
    try {
        const count = await Partner.countDocuments({
            status: { $in: ['pending_edit', 'pending_delete'] }
        });
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending count',
            error: error.message
        });
    }
};

export const getAllPending = async (req, res) => {
    try {
        const pending = await Partner.find({
            status: { $in: ['pending_edit', 'pending_delete'] }
        })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ updatedAt: -1 });

        res.json({
            success: true,
            data: pending
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending partners',
            error: error.message
        });
    }
};

// Export CSV (Direct)
export const exportCSV = async (req, res) => {
    try {
        // Interns can read but must not bulk-export (S13).
        if (req.user && req.user.role === 'intern') {
            return res.status(403).json({
                success: false,
                message: 'Exporting data is restricted to admin and employee roles.'
            });
        }

        // Match the list page: workflow-active only (excludes pending_edit /
        // pending_delete rows the UI hides and gates), recordStatus expiry included.
        const partners = await Partner.find({ status: 'active' }).sort({ createdAt: -1 }).lean();

        // Define fields for CSV
        const fields = [
            'country',
            'university',
            'school',
            'contactPerson',
            'email',
            'phoneNumber',
            'agreementType',
            'mouStatus',
            'activeStatus',
            { label: 'recordStatus', value: (row) => isExpiredValue(row.expiringDate) ? 'expired' : 'active' },
            { label: 'Signing Date', value: (row) => fmtDDMMM(row.signingDate) },
            { label: 'Expiry Date', value: (row) => fmtDDMMM(row.expiringDate) },
            'link'
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(partners);

        res.header('Content-Type', 'text/csv');
        res.attachment('partners-export.csv');
        return res.send(csv);

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting CSV'
        });
    }
};
