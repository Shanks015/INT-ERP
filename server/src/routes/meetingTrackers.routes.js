import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/meetingTrackers.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import MeetingTracker from '../models/MeetingTracker.js';
import { approve, reject } from '../controllers/generic.controller.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(MeetingTracker));
router.get('/export-csv', authenticate, ctrl.exportCSV);

// Pending routes (must be before /:id)
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount);
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending);

// CRUD routes
router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

// Pending actions routes
router.post('/pending/:id/approve', authenticate, authorize(['admin']), approve(MeetingTracker));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), reject(MeetingTracker));

export default router;
