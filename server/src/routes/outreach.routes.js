import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import * as outreachController from '../controllers/outreach.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

// Get stats
router.get('/stats', outreachController.getOutreachStats);

// Export to CSV
router.get('/export-csv', outreachController.exportOutreachCSV);

// Import from CSV
router.post('/import-csv', upload.single('file'), outreachController.importOutreachCSV);

// Get pending items (admin only) - MUST BE BEFORE /:id
router.get('/pending/all', authorize(['admin']), outreachController.getOutreachPending);

// Approve pending changes (admin only)
router.post('/pending/:id/approve', authorize(['admin']), outreachController.approveOutreach);

// Reject pending changes (admin only)
router.post('/pending/:id/reject', authorize(['admin']), outreachController.rejectOutreach);

// Get all outreach data
router.get('/', outreachController.getAllOutreach);

// Get single outreach by ID - MUST BE AFTER specific routes
router.get('/:id', outreachController.getOutreachById);

// Create new outreach
router.post('/', outreachController.createOutreach);

// Update outreach
router.put('/:id', outreachController.updateOutreach);

// Delete outreach (standard users create delete request)
router.delete('/:id', outreachController.deleteOutreach);

export default router;
