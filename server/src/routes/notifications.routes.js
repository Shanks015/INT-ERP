import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    getMyNotifications,
    getUnreadCount,
    markAllRead,
    markOneRead
} from '../controllers/notifications.controller.js';

const router = express.Router();

// All routes require authentication; recipients are scoped to req.user._id.
router.use(authenticate);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/read-all', markAllRead);
router.post('/:id/read', markOneRead);

export default router;
