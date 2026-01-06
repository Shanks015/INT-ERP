import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getActivityLogs,
    getActivityStats,
    exportActivityLogs
} from '../controllers/activityLogs.controller.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use((req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
    next();
});

// Get activity logs with filtering
router.get('/', getActivityLogs);

// Get activity statistics
router.get('/stats', getActivityStats);

// Export activity logs to CSV
router.get('/export', exportActivityLogs);

export default router;
