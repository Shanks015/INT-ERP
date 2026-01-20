import Partner from '../models/Partner.js';
import { Parser } from 'json2csv';

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
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        const query = {};

        // Search
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            query.$or = [
                { university: searchRegex },
                { school: searchRegex },
                { country: searchRegex },
                { contactPerson: searchRegex },
                { agreementType: searchRegex }
            ];
        }

        // Filters
        if (country && country !== 'all') query.country = { $regex: country, $options: 'i' };
        if (mouStatus && mouStatus !== 'all') query.mouStatus = mouStatus;
        if (agreementType && agreementType !== 'all') query.agreementType = agreementType;

        // recordStatus (active/expired)
        if (recordStatus && recordStatus !== 'all') {
            query.recordStatus = recordStatus;
        }

        // Calculate pagination
        const skip = (page - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query
        const [partners, total] = await Promise.all([
            Partner.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Partner.countDocuments(query)
        ]);

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
            ...req.body,
            createdBy: req.userId
        });
        await partner.save();
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
        const partner = await Partner.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Partner not found'
            });
        }

        res.json({
            success: true,
            message: 'Partner updated successfully',
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
        const partner = await Partner.findByIdAndDelete(req.params.id);
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: 'Partner not found'
            });
        }
        res.json({
            success: true,
            message: 'Partner deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting partner',
            error: error.message
        });
    }
};

// Dummy pending functions to satisfy frontend polling
export const getPendingCount = async (req, res) => {
    res.json({ success: true, count: 0 });
};

export const getAllPending = async (req, res) => {
    res.json({ success: true, data: [] });
};

// Export CSV (Direct)
export const exportCSV = async (req, res) => {
    try {
        const partners = await Partner.find().sort({ createdAt: -1 }).lean();

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
            'recordStatus',
            { label: 'Signing Date', value: (row) => row.signingDate ? new Date(row.signingDate).toLocaleDateString() : '' },
            { label: 'Expiry Date', value: (row) => row.expiringDate ? new Date(row.expiringDate).toLocaleDateString() : '' },
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
