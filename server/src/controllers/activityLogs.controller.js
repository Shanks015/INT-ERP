import ActivityLog from '../models/ActivityLog.js';
import { Parser } from 'json2csv';

// Get activity logs with filtering and pagination
export const getActivityLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            user,
            module,
            action,
            startDate,
            endDate,
            search
        } = req.query;

        // Build filter object
        const filter = {};

        if (user) filter.user = user;
        if (module) filter.module = module;
        if (action) filter.action = action;

        // Date range filter
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        // Search in userName or targetName
        if (search) {
            filter.$or = [
                { userName: { $regex: search, $options: 'i' } },
                { targetName: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get logs with pagination
        const logs = await ActivityLog.find(filter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('user', 'name email role')
            .lean();

        // Get total count
        const total = await ActivityLog.countDocuments(filter);

        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                current: parseInt(page),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity logs'
        });
    }
};

// Get activity log statistics
export const getActivityStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.timestamp = {};
            if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
            if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
        }

        // Get total count
        const total = await ActivityLog.countDocuments(dateFilter);

        // Get counts by action
        const byAction = await ActivityLog.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get counts by module
        const byModule = await ActivityLog.aggregate([
            { $match: dateFilter },
            { $group: { _id: '$module', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get counts by user (top 10)
        const byUser = await ActivityLog.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: { user: '$user', userName: '$userName' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    userId: '$_id.user',
                    userName: '$_id.userName',
                    count: 1
                }
            }
        ]);

        // Get recent activity (last 20)
        const recentActivity = await ActivityLog.find(dateFilter)
            .sort({ timestamp: -1 })
            .limit(20)
            .select('userName action module targetName timestamp')
            .lean();

        res.json({
            success: true,
            stats: {
                total,
                byAction,
                byModule,
                byUser,
                recentActivity
            }
        });
    } catch (error) {
        console.error('Error fetching activity stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching activity statistics'
        });
    }
};

// Export activity logs to CSV
export const exportActivityLogs = async (req, res) => {
    try {
        const {
            user,
            module,
            action,
            startDate,
            endDate
        } = req.query;

        // Build filter
        const filter = {};
        if (user) filter.user = user;
        if (module) filter.module = module;
        if (action) filter.action = action;

        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }

        // Get logs (limit to 10,000 for performance)
        const logs = await ActivityLog.find(filter)
            .sort({ timestamp: -1 })
            .limit(10000)
            .populate('user', 'name email')
            .lean();

        // Format data for CSV
        const csvData = logs.map(log => ({
            Date: new Date(log.timestamp).toLocaleString(),
            User: log.userName,
            Email: log.user?.email || 'N/A',
            Action: log.action.toUpperCase(),
            Module: log.module,
            Target: log.targetName || 'N/A',
            IPAddress: log.ipAddress || 'N/A',
            StatusCode: log.statusCode
        }));

        // Convert to CSV
        const parser = new Parser();
        const csv = parser.parse(csvData);

        // Set headers for download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=activity-logs-${Date.now()}.csv`);

        res.send(csv);
    } catch (error) {
        console.error('Error exporting activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting activity logs'
        });
    }
};
