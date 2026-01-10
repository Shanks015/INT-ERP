import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import Partner from '../models/Partner.js';

const router = express.Router();

// IMPORTANT: Specific routes MUST come before /:id parameterized route
// Otherwise Express will match /export-csv as /:id with id="export-csv"

// Stats route (must be before /:id)
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(Partner));

// Export route (must be before /:id)
router.get('/export-csv', authenticate, ctrl.exportCSV(Partner));

// Pending routes (must be before /:id)
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(Partner));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(Partner));

// Standard CRUD routes
router.get('/', authenticate, ctrl.getAll(Partner));
router.get('/:id', authenticate, ctrl.getById(Partner)); // This must come AFTER specific routes
router.post('/', authenticate, ctrl.create(Partner));
router.put('/:id', authenticate, ctrl.update(Partner));
router.delete('/:id', authenticate, ctrl.remove(Partner));

// Admin approval routes
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(Partner));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(Partner));

export default router;
