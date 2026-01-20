import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/partners.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import Partner from '../models/Partner.js';

const router = express.Router();

// IMPORTANT: Specific routes MUST come before /:id parameterized route
// Otherwise Express will match /export-csv as /:id with id="export-csv"

// Stats route (must be before /:id)
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(Partner));

// Export route (must be before /:id)
router.get('/export-csv', authenticate, ctrl.exportCSV);

// Pending routes (must be before /:id) - Dummy endpoints to prevent 404s
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount);
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending);

// Standard CRUD routes
router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById); // This must come AFTER specific routes
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

export default router;
