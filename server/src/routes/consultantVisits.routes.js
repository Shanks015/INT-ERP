import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import ConsultantVisit from '../models/ConsultantVisit.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(ConsultantVisit));
router.get('/export-csv', authenticate, ctrl.exportCSV(ConsultantVisit));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(ConsultantVisit));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(ConsultantVisit));

// Add date field config for filtering
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = { field: 'date' };
    next();
}, ctrl.getAll(ConsultantVisit));
router.get('/:id', authenticate, ctrl.getById(ConsultantVisit));
router.post('/', authenticate, ctrl.create(ConsultantVisit));
router.put('/:id', authenticate, ctrl.update(ConsultantVisit));
router.delete('/:id', authenticate, ctrl.remove(ConsultantVisit));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(ConsultantVisit));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(ConsultantVisit));

export default router;
