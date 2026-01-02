import { Parser } from 'json2csv';

// Generic CRUD controller factory for all modules with approval workflow

// Get all records with filters, search, sorting, and pagination
export const getAll = (Model) => async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            status,
            startDate,
            endDate,
            country,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query
        let query = {};

        // Search filter (searches in multiple fields, case-insensitive)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { university: { $regex: search, $options: 'i' } },
                { universityName: { $regex: search, $options: 'i' } },
                { visitorName: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
                { country: { $regex: search, $options: 'i' } },
                { summary: { $regex: search, $options: 'i' } }
            ];
        }

        // Status filter
        if (status && status !== 'all') {
            query.approvalStatus = status;
        }

        // Country filter
        if (country) {
            query.country = { $regex: country, $options: 'i' };
        }

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Calculate pagination
        const skip = (page - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query with pagination
        const [data, total] = await Promise.all([
            Model.find(query)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Model.countDocuments(query)
        ]);

        res.json({
            success: true,
            data,
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
            message: 'Error fetching records',
            error: error.message
        });
    }
};

// Get single record by ID
export const getById = (Model) => async (req, res) => {
    try {
        const record = await Model.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        res.json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching record',
            error: error.message
        });
    }
};

// Create new record
export const create = (Model) => async (req, res) => {
    try {
        const record = new Model({
            ...req.body,
            createdBy: req.userId,
            status: 'active'
        });

        await record.save();

        res.status(201).json({
            success: true,
            message: 'Record created successfully',
            data: record
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating record',
            error: error.message
        });
    }
};

// Update record with approval workflow
export const update = (Model) => async (req, res) => {
    try {
        const record = await Model.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Check if record is already pending
        if (record.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit a record that has pending changes'
            });
        }

        // Admin can directly update
        if (req.user.role === 'admin') {
            Object.assign(record, req.body);
            record.updatedBy = req.userId;
            await record.save();

            return res.json({
                success: true,
                message: 'Record updated successfully',
                data: record
            });
        }

        // Employee/Intern creates pending edit
        record.status = 'pending_edit';
        record.pendingChanges = req.body;
        record.updatedBy = req.userId;
        await record.save();

        res.json({
            success: true,
            message: 'Edit request submitted for approval',
            data: record
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating record',
            error: error.message
        });
    }
};

// Delete record with approval workflow
export const remove = (Model) => async (req, res) => {
    try {
        const { reason } = req.body;
        const record = await Model.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        // Check if record is already pending
        if (record.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a record that has pending changes'
            });
        }

        // Admin can directly delete
        if (req.user.role === 'admin') {
            await Model.findByIdAndDelete(req.params.id);

            return res.json({
                success: true,
                message: 'Record deleted successfully'
            });
        }

        // Employee/Intern creates pending delete
        record.status = 'pending_delete';
        record.deletionReason = reason || '';
        record.updatedBy = req.userId;
        await record.save();

        res.json({
            success: true,
            message: 'Delete request submitted for approval',
            data: record
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting record',
            error: error.message
        });
    }
};

// Get count of pending actions (admin only)
export const getPendingCount = (Model) => async (req, res) => {
    try {
        const count = await Model.countDocuments({
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

// Approve pending changes (admin only)
export const approve = (Model) => async (req, res) => {
    try {
        const record = await Model.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        if (record.status === 'pending_edit') {
            // Apply pending changes
            Object.assign(record, record.pendingChanges);
            record.status = 'active';
            record.pendingChanges = null;
            record.updatedBy = req.userId;
            await record.save();

            return res.json({
                success: true,
                message: 'Edit approved and applied',
                data: record
            });
        }

        if (record.status === 'pending_delete') {
            // Delete the record
            await Model.findByIdAndDelete(req.params.id);

            return res.json({
                success: true,
                message: 'Deletion approved and completed'
            });
        }

        res.status(400).json({
            success: false,
            message: 'No pending action to approve'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error approving changes',
            error: error.message
        });
    }
};

// Reject pending changes (admin only)
export const reject = (Model) => async (req, res) => {
    try {
        const { reason } = req.body;
        const record = await Model.findById(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Record not found'
            });
        }

        if (record.status === 'pending_edit' || record.status === 'pending_delete') {
            // Restore to active status
            record.status = 'active';
            record.pendingChanges = null;
            record.deletionReason = null;
            // Store rejection reason (optional - could add rejectionReason field)
            await record.save();

            return res.json({
                success: true,
                message: 'Request rejected and record restored',
                data: record,
                rejectionReason: reason
            });
        }

        res.status(400).json({
            success: false,
            message: 'No pending action to reject'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error rejecting changes',
            error: error.message
        });
    }
};

// Export to CSV
export const exportCSV = (Model) => async (req, res) => {
    try {
        const records = await Model.find({ status: 'active' }).lean();

        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No records to export'
            });
        }

        // Remove MongoDB-specific fields
        const cleanRecords = records.map(record => {
            const { _id, __v, status, pendingChanges, deletionReason, createdBy, updatedBy, ...rest } = record;
            return rest;
        });

        const parser = new Parser();
        const csv = parser.parse(cleanRecords);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="${Model.modelName.toLowerCase()}-export.csv"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting to CSV',
            error: error.message
        });
    }
};

// Get all pending actions across all modules (admin only)
export const getAllPending = (Model) => async (req, res) => {
    try {
        const records = await Model.find({
            status: { $in: ['pending_edit', 'pending_delete'] }
        })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ updatedAt: -1 });

        res.json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending records',
            error: error.message
        });
    }
};

// Get statistics for a module
export const getStats = (Model) => async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Basic stats that all models have
        const [total, thisMonth, thisYear] = await Promise.all([
            Model.countDocuments(),
            Model.countDocuments({ createdAt: { $gte: startOfMonth } }),
            Model.countDocuments({ createdAt: { $gte: startOfYear } })
        ]);

        // Try to get approval stats if the model has approvalStatus field
        let pending = 0;
        let approved = 0;

        try {
            const sampleDoc = await Model.findOne();
            if (sampleDoc && 'approvalStatus' in sampleDoc.toObject()) {
                [pending, approved] = await Promise.all([
                    Model.countDocuments({ approvalStatus: 'pending' }),
                    Model.countDocuments({ approvalStatus: 'approved' })
                ]);
            }
        } catch (err) {
            // Model doesn't have approvalStatus, that's okay
        }

        res.json({
            success: true,
            stats: {
                total,
                thisMonth,
                thisYear,
                pending,
                approved
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};
