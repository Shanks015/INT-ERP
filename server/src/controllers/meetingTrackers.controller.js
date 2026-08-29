import MeetingTracker from '../models/MeetingTracker.js';
import { Parser } from 'json2csv';
import { logUserActivity, sanitizeInput } from './generic.controller.js';

// Helper to parse date from Excel or user input
const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    return new Date(value);
};

// Get all meeting trackers with search, pagination, and sorting
export const getAll = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search,
            startDate,
            endDate,
            sortBy = 'date',
            sortOrder = 'desc',
            ...filters
        } = req.query;

        // Build query
        const query = {};

        // Search
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            query.$or = [
                { meetingId: searchRegex },
                { meetingTitle: searchRegex },
                { mode: searchRegex },
                { platformLocation: searchRegex },
                { hostOrganization: searchRegex },
                { hostName: searchRegex },
                { hostEmail: searchRegex },
                { participants: searchRegex },
                { keyAgenda: searchRegex },
                { discussionSummary: searchRegex },
                { actionItems: searchRegex },
                { remarks: searchRegex },
                { sheetMonth: searchRegex }
            ];
        }

        // Date range
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        // Other filters
        Object.keys(filters).forEach(key => {
            if (filters[key] && filters[key] !== 'all') {
                query[key] = filters[key];
            }
        });

        // Calculate pagination
        const skip = (page - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Execute query
        const [meetings, total] = await Promise.all([
            MeetingTracker.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            MeetingTracker.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: meetings,
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
            message: 'Error fetching meeting trackers',
            error: error.message
        });
    }
};

// Get meeting tracker by ID
export const getById = async (req, res) => {
    try {
        const meeting = await MeetingTracker.findById(req.params.id);
        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting tracker not found'
            });
        }
        res.json({ success: true, data: meeting });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching meeting tracker',
            error: error.message
        });
    }
};

// Create meeting tracker
export const create = async (req, res) => {
    try {
        const meeting = new MeetingTracker({
            ...sanitizeInput(req.body),
            createdBy: req.userId,
            status: 'active'
        });
        await meeting.save();

        // Log creation activity
        await logUserActivity(req, 'create', 'MeetingTracker', meeting);

        res.status(201).json({
            success: true,
            message: 'Meeting tracker created successfully',
            data: meeting
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating meeting tracker',
            error: error.message
        });
    }
};

// Update meeting tracker
export const update = async (req, res) => {
    try {
        const meeting = await MeetingTracker.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting tracker not found'
            });
        }

        // Check if record is active
        if (meeting.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot edit a record that has pending changes'
            });
        }

        // Admin can directly update
        if (req.user.role === 'admin') {
            Object.assign(meeting, sanitizeInput(req.body));
            meeting.updatedBy = req.userId;
            await meeting.save();

            // Log admin update activity
            await logUserActivity(req, 'update', 'MeetingTracker', meeting);

            return res.json({
                success: true,
                message: 'Meeting tracker updated successfully',
                data: meeting
            });
        }

        // Employee/Intern creates pending edit
        meeting.status = 'pending_edit';
        meeting.pendingChanges = sanitizeInput(req.body);
        meeting.updatedBy = req.userId;
        await meeting.save();

        // Log employee staged update activity
        await logUserActivity(req, 'update', 'MeetingTracker', meeting);

        res.json({
            success: true,
            message: 'Edit request submitted for approval',
            data: meeting
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating meeting tracker',
            error: error.message
        });
    }
};

// Delete meeting tracker
export const remove = async (req, res) => {
    try {
        const { reason } = req.body;
        const meeting = await MeetingTracker.findById(req.params.id);

        if (!meeting) {
            return res.status(404).json({
                success: false,
                message: 'Meeting tracker not found'
            });
        }

        // Check status
        if (meeting.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete a record that has pending changes'
            });
        }

        // Admin can directly delete
        if (req.user.role === 'admin') {
            await MeetingTracker.findByIdAndDelete(req.params.id);

            // Log admin delete activity
            await logUserActivity(req, 'delete', 'MeetingTracker', meeting);

            return res.json({
                success: true,
                message: 'Meeting tracker deleted successfully'
            });
        }

        // Employee/Intern creates pending delete
        meeting.status = 'pending_delete';
        meeting.deletionReason = reason || '';
        meeting.updatedBy = req.userId;
        await meeting.save();

        // Log employee staged delete activity
        await logUserActivity(req, 'delete', 'MeetingTracker', meeting);

        res.json({
            success: true,
            message: 'Delete request submitted for approval',
            data: meeting
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting meeting tracker',
            error: error.message
        });
    }
};

// Export CSV
export const exportCSV = async (req, res) => {
    try {
        const meetings = await MeetingTracker.find({ status: 'active' }).lean();

        if (meetings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No records to export'
            });
        }

        const cleanRecords = meetings.map(record => {
            const { _id, __v, status, pendingChanges, deletionReason, createdBy, updatedBy, ...rest } = record;
            return rest;
        });

        const parser = new Parser();
        const csv = parser.parse(cleanRecords);

        await logUserActivity(req, 'export', 'MeetingTracker', null);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="meeting-trackers-export.csv"');
        res.send(csv);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error exporting meeting trackers'
        });
    }
};

// Get count of pending actions (admin only)
export const getPendingCount = async (req, res) => {
    try {
        const count = await MeetingTracker.countDocuments({
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

// Get all pending records (admin only)
export const getAllPending = async (req, res) => {
    try {
        const pendingMeetings = await MeetingTracker.find({
            status: { $in: ['pending_edit', 'pending_delete'] }
        })
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email')
            .sort({ updatedAt: -1 });

        res.json({
            success: true,
            data: pendingMeetings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching pending meeting trackers',
            error: error.message
        });
    }
};
