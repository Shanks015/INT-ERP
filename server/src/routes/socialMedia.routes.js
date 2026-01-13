import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import SocialMedia from '../models/SocialMedia.js';

const router = express.Router();

// IMPORTANT: Specific routes MUST come before /:id parameterized route

// Stats route (must be before /:id)
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(SocialMedia));

// Export route (must be before /:id)
router.get('/export-csv', authenticate, ctrl.exportCSV(SocialMedia));

// Pending routes (must be before /:id)
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(SocialMedia));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(SocialMedia));

// Standard CRUD routes
// Social Media uses createdAt for filtering (default) since no specific date field
router.get('/', authenticate, ctrl.getAll(SocialMedia));
router.get('/:id', authenticate, ctrl.getById(SocialMedia)); // This must come AFTER specific routes
router.post('/', authenticate, ctrl.create(SocialMedia));
router.put('/:id', authenticate, ctrl.update(SocialMedia));
router.delete('/:id', authenticate, ctrl.remove(SocialMedia));

// Admin approval routes
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(SocialMedia));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(SocialMedia));

export default router;
