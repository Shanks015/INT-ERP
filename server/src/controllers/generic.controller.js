import { Parser } from 'json2csv';
import fs from 'fs';
import ActivityLog from '../models/ActivityLog.js';
import { emitToAdmins, emitToUser, resolveNotifications } from '../services/notificationService.js';
import {
    expiryDateField,
    activeCondition,
    expiredCondition,
    isExpiredValue,
    mergeConditions
} from '../utils/recordExpiry.js';

// Generic CRUD controller factory for all modules with approval workflow

// Helper mapping for Mongoose model names to ActivityLog modules
const getModuleName = (modelName) => {
    const mapping = {
        'Partner': 'partners',
        'Event': 'events',
        'Conference': 'conferences',
        'CampusVisit': 'campus-visits',
        'Seminar': 'seminars',
        'ConsultantVisit': 'consultant-visits',
        'ImmersionProgram': 'immersion-programs',
        'MouSigningCeremony': 'mou-signing',
        'ScholarInResidence': 'scholars',
        'MouUpdate': 'mou-updates',
        'StudentExchange': 'student-exchange',
        'MastersAbroad': 'masters-abroad',
        'Membership': 'memberships',
        'DigitalMedia': 'digital-media',
        'Outreach': 'outreach'
    };
    return mapping[modelName] || modelName.toLowerCase();
};

// Human label for the notification `module` field (shown in the bell), and the
// client list path used as a decision-notification `link`. Keep in sync with the
// routes in client/src/App.jsx. getModuleName() stays the ActivityLog slug — do
// not overload it with display duties.
const MODULE_LABELS = {
    'Partner': 'Partners',
    'Event': 'Events',
    'Conference': 'Conferences',
    'CampusVisit': 'Campus Visits',
    'Seminar': 'Seminars',
    'ConsultantVisit': 'Consultant Visits',
    'ImmersionProgram': 'Immersion Programs',
    'MouSigningCeremony': 'MoU Signing Ceremonies',
    'ScholarInResidence': 'Scholars in Residence',
    'MouUpdate': 'MoU Updates',
    'StudentExchange': 'Student Exchange',
    'MastersAbroad': 'Masters Abroad',
    'Membership': 'Memberships',
    'DigitalMedia': 'Digital Media',
    'Outreach': 'Outreach'
};
const MODULE_PATHS = {
    'Partner': '/partners',
    'Event': '/events',
    'Conference': '/conferences',
    'CampusVisit': '/campus-visits',
    'Seminar': '/seminars',
    'ConsultantVisit': '/consultant-visits',
    'ImmersionProgram': '/immersion-programs',
    'MouSigningCeremony': '/mou-signing-ceremonies',
    'ScholarInResidence': '/scholars-in-residence',
    'MouUpdate': '/mou-updates',
    'StudentExchange': '/student-exchange',
    'MastersAbroad': '/masters-abroad',
    'Membership': '/memberships',
    'DigitalMedia': '/digital-media',
    'Outreach': '/outreach'
};
const moduleLabel = (modelName) => MODULE_LABELS[modelName] || getModuleName(modelName);
const modulePath = (modelName) => MODULE_PATHS[modelName] || `/pending-actions`;

// Fields that are controlled by the server and must never be set from a request
// body. Without this, `Object.assign(record, req.body)` lets a client set its own
// `status` (bypassing the maker-checker workflow) or rewrite `createdBy`.
const PROTECTED_FIELDS = [
    '_id',
    '__v',
    'status',
    'pendingChanges',
    'deletionReason',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt'
];

// Strip server-controlled fields from a client-supplied object.
// Used on every path where request data reaches a document: create, update,
// and — importantly — approve, which applies previously-stored pendingChanges.
export const sanitizeInput = (payload) => {
    if (!payload || typeof payload !== 'object') return {};
    const clean = { ...payload };
    PROTECTED_FIELDS.forEach(field => delete clean[field]);
    return clean;
};

// Escape regex metacharacters so user/filter values (e.g. "The Print (ANI Wire)")
// are matched literally instead of being parsed as regex syntax.
export const escapeRegex = (s) => String(s ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const logUserActivity = async (req, action, modelName, record) => {
    try {
        if (!req.user) return; // Must have authenticated user to log

        let targetName = null;
        if (record) {
            targetName = recordLabel(record);
        }

        await ActivityLog.logActivity({
            user: req.user._id,
            userName: req.user.name,
            action,
            module: getModuleName(modelName),
            targetId: record ? String(record._id) : null,
            targetName: targetName ? String(targetName) : null,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            method: req.method,
            path: req.path,
            statusCode: 200
        });
    } catch (err) {
        console.error('Error in logUserActivity helper:', err);
    }
};

// Best human-readable label for a record across all generic modules — the same
// field sweep the activity log uses, factored out so notification bodies and
// log entries name the record identically.
export const recordLabel = (record) => {
    if (!record) return null;
    return record.name || record.title || record.university ||
        record.universityName || record.visitorName || record.studentName ||
        record.scholarName || record.topic || record.nameOfOrganization ||
        record.dignitaries || record.conferenceName || record.organizationName ||
        record.programName || record.postName || record.articleTopic ||
        record.exchangeUniversity;
};

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
            sortOrder = 'desc',
            ...otherFilters  // Capture all other query parameters
        } = req.query;

        // Build query
        let query = {};

        // Search filter: Use regex for flexible partial matching across common fields
        // This works with all models without requiring text indexes
        if (search && search.trim()) {
            // Free-text search is a case-insensitive substring; escape so literal
            // metacharacters (e.g. '(' in a channel) match instead of throwing or
            // never matching (same class of bug as the anchored filter, S4).
            const searchRegex = { $regex: escapeRegex(search.trim()), $options: 'i' };

            // Search across common fields that might exist in any model
            query.$or = [
                { name: searchRegex },
                { title: searchRegex },
                { university: searchRegex },
                { universityName: searchRegex },  // Added for Campus Visits
                { exchangeUniversity: searchRegex }, // Student Exchange
                { visitorName: searchRegex },
                { scholarName: searchRegex },
                { designation: searchRegex },     // Scholar in Residence
                { studentName: searchRegex },
                { conferenceName: searchRegex },
                { contactName: searchRegex },
                { country: searchRegex },
                { department: searchRegex },
                { partnerName: searchRegex },
                { programName: searchRegex },
                { organizationName: searchRegex },
                { channel: searchRegex },
                { email: searchRegex },
                { mobile: searchRegex },           // Scholar in Residence
                // Content fields per module so search covers each module's real
                // title/summary (Digital Media topic, Social Media post, etc.).
                // Missing fields in $or are harmless — they simply never match.
                { articleTopic: searchRegex },     // Digital Media
                { eventSummary: searchRegex },     // Digital Media / Events / Conferences / Visits
                { summary: searchRegex },          // Membership / generic
                { postName: searchRegex },         // Social Media
                { caption: searchRegex }           // Social Media
            ];
        }

        // Status filter - check both 'status' and 'approvalStatus' fields
        if (status && status !== 'all') {
            query.status = status;
        }

        // Country filter
        if (country && country !== 'all') {
            query.country = { $regex: escapeRegex(country), $options: 'i' };
        }

        // Apply all other filters dynamically (type, category, visitType, etc.)
        // Supports comma-separated multi-values, e.g. type=Guest Lecture,Seminar → $in query
        // Uses case-insensitive regex to match legacy data with inconsistent casing.
        // Values are regex-escaped so option values containing metacharacters
        // (e.g. channel "The Print (ANI Wire)") match literally.
        Object.keys(otherFilters).forEach(key => {
            const value = otherFilters[key];
            if (value && value !== 'all' && value.trim() !== '') {
                // recordStatus is a stored field that only pre('save') keeps fresh,
                // so imported/idle rows go stale. For modules with a real end date we
                // derive the filter from that date instead of trusting the stored
                // value (see utils/recordExpiry.js). Modules without a lifecycle
                // (Masters Abroad, MoU Signing Ceremony) fall through to the stored
                // field below — harmless, since every row is stored 'active' anyway.
                const expiryField = expiryDateField(Model.modelName);
                if (key === 'recordStatus' && expiryField) {
                    const cond = value.toLowerCase() === 'expired'
                        ? expiredCondition(expiryField)
                        : value.toLowerCase() === 'active' ? activeCondition(expiryField) : null;
                    if (cond) query = mergeConditions(query, cond);
                    return;
                }
                const values = value.split(',').map(v => v.trim()).filter(Boolean);
                if (values.length > 1) {
                    // Multi-value: case-insensitive OR matching
                    query[key] = { $in: values.map(v => new RegExp(`^${escapeRegex(v)}$`, 'i')) };
                } else {
                    // Single value: case-insensitive exact match
                    query[key] = { $regex: `^${escapeRegex(values[0])}$`, $options: 'i' };
                }
            }
        });

        // Date range filter - support model-specific date fields
        // Configuration is passed via req.locals by route middleware
        if (startDate || endDate) {
            const dateFieldConfig = req.locals?.dateFieldConfig || {};
            const dateField = dateFieldConfig.field || 'createdAt';
            const hasFromToFields = dateFieldConfig.isRange || false;
            const arrivalDeparture = dateFieldConfig.arrivalDeparture || false;
            // Range models can override the two boundary fields (defaults keep
            // StudentExchange's fromDate/toDate behaviour unchanged; Scholar in
            // Residence now uses startDate/endDate).
            const startField = dateFieldConfig.startField || 'fromDate';
            const endField = dateFieldConfig.endField || 'toDate';

            if (arrivalDeparture) {
                // For Immersion Programs with arrivalDate and departureDate fields
                if (startDate) {
                    query.departureDate = { $gte: new Date(startDate) };
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    query.arrivalDate = { $lte: end };
                }
            } else if (hasFromToFields) {
                // For models with a start/end date range pair
                // Filter records where the date range overlaps with the search range
                if (startDate) {
                    query[endField] = { $gte: new Date(startDate) };
                }
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    query[startField] = { $lte: end };
                }
            } else {
                // For models with a single date field
                query[dateField] = {};
                if (startDate) query[dateField].$gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    query[dateField].$lte = end;
                }
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

        // Derive each returned doc's recordStatus from its real end date so row
        // badges in the UI match reality (stored value goes stale — see
        // utils/recordExpiry.js). Mutating the mongoose doc is serialization-only;
        // nothing is saved. Modules without a lifecycle are untouched.
        const expiryField = expiryDateField(Model.modelName);
        if (expiryField) {
            data.forEach(doc => {
                doc.recordStatus = isExpiredValue(doc[expiryField]) ? 'expired' : 'active';
            });
        }

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

        // Same read-time derivation as getAll (serialization-only).
        const expiryField = expiryDateField(Model.modelName);
        if (expiryField) {
            record.recordStatus = isExpiredValue(record[expiryField]) ? 'expired' : 'active';
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
            ...sanitizeInput(req.body),
            createdBy: req.userId,
            status: 'active'
        });

        await record.save();

        // Log creation activity
        await logUserActivity(req, 'create', Model.modelName, record);

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
            Object.assign(record, sanitizeInput(req.body));
            record.updatedBy = req.userId;
            await record.save();

            // Log admin direct update activity
            await logUserActivity(req, 'update', Model.modelName, record);

            return res.json({
                success: true,
                message: 'Record updated successfully',
                data: record
            });
        }

        // Employee/Intern creates pending edit
        record.status = 'pending_edit';
        record.pendingChanges = sanitizeInput(req.body);
        record.updatedBy = req.userId;
        await record.save();

        // Notify admins a staged edit awaits their decision. Never throws.
        await emitToAdmins({
            category: 'approval',
            title: 'Edit request awaiting approval',
            body: `${req.user.name} requested an edit to "${recordLabel(record) || 'a record'}" in ${moduleLabel(Model.modelName)}.`,
            module: moduleLabel(Model.modelName),
            link: '/pending-actions',
            // Resolved (deleted) for every admin when this request is decided.
            resolveKey: `record:${Model.modelName}:${record._id}`
        });

        // Log employee staged update activity
        await logUserActivity(req, 'update', Model.modelName, record);

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

            // Log admin direct delete activity
            await logUserActivity(req, 'delete', Model.modelName, record);

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

        // Notify admins a staged delete awaits their decision. Never throws.
        await emitToAdmins({
            category: 'approval',
            title: 'Delete request awaiting approval',
            body: `${req.user.name} requested to delete "${recordLabel(record) || 'a record'}" in ${moduleLabel(Model.modelName)}.`,
            module: moduleLabel(Model.modelName),
            link: '/pending-actions',
            // Resolved (deleted) for every admin when this request is decided.
            resolveKey: `record:${Model.modelName}:${record._id}`
        });

        // Log employee staged delete activity
        await logUserActivity(req, 'delete', Model.modelName, record);

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
            // The requester is whoever staged the edit (record.updatedBy). Capture
            // before approve() overwrites it with the admin, so the decision
            // notification can reach them.
            const requesterId = record.updatedBy;
            // Apply pending changes. Sanitized again on the way out, not only on
            // the way in: records staged before this safeguard existed may hold
            // protected fields in pendingChanges, and applying them here would
            // let a non-admin escalate through the approval step itself.
            Object.assign(record, sanitizeInput(record.pendingChanges));
            record.status = 'active';
            record.pendingChanges = null;
            record.updatedBy = req.userId;
            await record.save();

            // Log admin approve edit activity
            await logUserActivity(req, 'update', Model.modelName, record);

            // The request is decided — clear every admin's "awaiting approval"
            // bell item for it. Never throws.
            await resolveNotifications({ resolveKey: `record:${Model.modelName}:${record._id}`, category: 'approval' });

            // Notify the requester of the decision. Never throws.
            if (requesterId) {
                await emitToUser({
                    recipientId: requesterId,
                    category: 'decision',
                    title: 'Edit approved',
                    body: `Your edit to "${recordLabel(record) || 'a record'}" in ${moduleLabel(Model.modelName)} was approved and applied.`,
                    module: moduleLabel(Model.modelName),
                    link: modulePath(Model.modelName)
                });
            }

            return res.json({
                success: true,
                message: 'Edit approved and applied',
                data: record
            });
        }

        if (record.status === 'pending_delete') {
            // Requester must be captured before the record is deleted.
            const requesterId = record.updatedBy;
            // Delete the record
            await Model.findByIdAndDelete(req.params.id);

            // Log admin approve delete activity
            await logUserActivity(req, 'delete', Model.modelName, record);

            // Request decided (record now deleted) — clear every admin's
            // "awaiting approval" bell item for it. Key survives deletion.
            await resolveNotifications({ resolveKey: `record:${Model.modelName}:${record._id}`, category: 'approval' });

            // Notify the requester of the decision. Never throws.
            if (requesterId) {
                await emitToUser({
                    recipientId: requesterId,
                    category: 'decision',
                    title: 'Delete approved',
                    body: `Your delete request for "${recordLabel(record) || 'a record'}" in ${moduleLabel(Model.modelName)} was approved.`,
                    module: moduleLabel(Model.modelName),
                    link: modulePath(Model.modelName)
                });
            }

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
            const oldStatus = record.status;
            // The requester (whoever staged the request) is still in
            // record.updatedBy at this point — capture for the decision note.
            const requesterId = record.updatedBy;
            const stagedKind = oldStatus === 'pending_edit' ? 'edit' : 'delete';
            // Restore to active status
            record.status = 'active';
            record.pendingChanges = null;
            record.deletionReason = null;
            // Store rejection reason (optional - could add rejectionReason field)
            await record.save();

            // Log admin reject staging activity
            await logUserActivity(req, 'update', Model.modelName, record);

            // Rejected = decided — clear every admin's "awaiting approval" bell
            // item for this request. Never throws.
            await resolveNotifications({ resolveKey: `record:${Model.modelName}:${record._id}`, category: 'approval' });

            // Notify the requester of the decision. Never throws.
            if (requesterId) {
                await emitToUser({
                    recipientId: requesterId,
                    category: 'decision',
                    title: `${stagedKind[0].toUpperCase() + stagedKind.slice(1)} rejected`,
                    body: `Your ${stagedKind} request for "${recordLabel(record) || 'a record'}" in ${moduleLabel(Model.modelName)} was rejected${reason ? `: ${reason}` : ''}.`,
                    module: moduleLabel(Model.modelName),
                    link: modulePath(Model.modelName)
                });
            }

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
// ── CSV export helpers (S13) ─────────────────────────────────────────────────
// Interns may view module data but must not bulk-extract whole tables, and CSVs
// must carry dd/MMM/yyyy dates like the rest of the app (json2csv would
// otherwise emit raw ISO datetimes). Each exportCSV applies both.
const CSV_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// dd/MMM/yyyy formatter (project standard).
export const fmtDDMMM = (v) => {
    if (!v) return '';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${CSV_MONTHS[d.getMonth()]}/${d.getFullYear()}`;
};

// Convert every Date value in a plain (already-leaned) record to dd/MMM/yyyy so
// the exported CSV matches screen/PDF formats instead of ISO datetimes.
export const stringifyDates = (record) => {
    const out = { ...record };
    Object.keys(out).forEach((key) => {
        const val = out[key];
        if (val instanceof Date) {
            out[key] = fmtDDMMM(val);
        } else if (Array.isArray(val)) {
            // Shallow pass: element arrays are typically scalar (emails, tags);
            // nested objects (e.g. embedded email threads) are not exported.
            out[key] = val.map((el) => (el instanceof Date ? fmtDDMMM(el) : el));
        }
    });
    return out;
};

export const exportCSV = (Model) => async (req, res) => {
    try {
        // Interns can read their assigned module but must not bulk-export it.
        if (req.user && req.user.role === 'intern') {
            return res.status(403).json({
                success: false,
                message: 'Exporting data is restricted to admin and employee roles.'
            });
        }

        const records = await Model.find({ status: 'active' }).lean();

        if (records.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No records to export'
            });
        }

        // Remove MongoDB-specific fields. recordStatus is derived from the module's
        // real end date when one exists (stored value goes stale — see
        // utils/recordExpiry.js).
        const expiryField = expiryDateField(Model.modelName);
        const cleanRecords = records.map(record => {
            const { _id, __v, status, pendingChanges, deletionReason, createdBy, updatedBy, ...rest } = record;
            if (expiryField && record[expiryField]) {
                rest.recordStatus = isExpiredValue(record[expiryField]) ? 'expired' : 'active';
            }
            return stringifyDates(rest);
        });

        const parser = new Parser();
        const csv = parser.parse(cleanRecords);

        // Log export activity
        await logUserActivity(req, 'export', Model.modelName, null);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', `attachment; filename="${Model.modelName.toLowerCase()}-export.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('EXPORT_CSV_CRASH:', error);
        try {
            fs.appendFileSync('error.log', `${new Date().toISOString()} - EXPORT ERROR: ${error.stack}\n`);
        } catch (e) {
            console.error('Failed to write to error log', e);
        }
        res.status(500).json({
            success: false,
            message: 'Error exporting to CSV',
            error: error.message,
            stack: error.stack
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
