import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as outreachController from '../controllers/outreach.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get stats
router.get('/stats', outreachController.getOutreachStats);

// Export to CSV
router.get('/export', outreachController.exportOutreachCSV);

// Get all outreach data
router.get('/', outreachController.getAllOutreach);

// Get single outreach by ID
router.get('/:id', outreachController.getOutreachById);

// Create new outreach
router.post('/', outreachController.createOutreach);

// Update outreach
router.put('/:id', outreachController.updateOutreach);

// Delete outreach (admin only)
router.delete('/:id', authorize(['admin']), outreachController.deleteOutreach);

// Approve pending changes (admin only)
router.post('/:id/approve', authorize(['admin']), outreachController.approveOutreach);

// Reject pending changes (admin only)
router.post('/:id/reject', authorize(['admin']), outreachController.rejectOutreach);

export default router;
