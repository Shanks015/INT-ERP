import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import Membership from '../models/Membership.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(Membership));
router.get('/export-csv', authenticate, ctrl.exportCSV(Membership));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(Membership));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(Membership));

// Date field config for filtering. Memberships shows Start/End Date columns, so
// the From/To filter means the membership window (overlap), not the hidden
// entry `date` (task #66).
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = {
        field: 'startDate',
        isRange: true,
        startField: 'startDate',
        endField: 'endDate'
    };
    next();
}, ctrl.getAll(Membership));
router.get('/:id', authenticate, ctrl.getById(Membership));
router.post('/', authenticate, ctrl.create(Membership));
router.put('/:id', authenticate, ctrl.update(Membership));
router.delete('/:id', authenticate, ctrl.remove(Membership));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(Membership));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(Membership));

export default router;
