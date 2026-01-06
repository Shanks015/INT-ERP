import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
    getActivityLogs,
    getActivityStats,
    exportActivityLogs
} from '../controllers/activityLogs.controller.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(auth);
router.use(authorize('admin'));

// Get activity logs with filtering
router.get('/', getActivityLogs);

// Get activity statistics
router.get('/stats', getActivityStats);

// Export activity logs to CSV
router.get('/export', exportActivityLogs);

export default router;
