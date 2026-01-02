import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
    getPendingUsers,
    getAllUsers,
    approveUser,
    rejectUser,
    getPendingCount
} from '../controllers/users.controller.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Get pending users count
router.get('/pending/count', getPendingCount);

// Get all pending users
router.get('/pending', getPendingUsers);

// Get all users (with optional status filter)
router.get('/', getAllUsers);

// Approve a user
router.post('/:id/approve', approveUser);

// Reject a user
router.post('/:id/reject', rejectUser);

export default router;
