import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import MouUpdate from '../models/MouUpdate.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(MouUpdate));
router.get('/export-csv', authenticate, ctrl.exportCSV(MouUpdate));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(MouUpdate));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(MouUpdate));

// Add date field config for filtering
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = { field: 'date' };
    next();
}, ctrl.getAll(MouUpdate));
router.get('/:id', authenticate, ctrl.getById(MouUpdate));
router.post('/', authenticate, ctrl.create(MouUpdate));
router.put('/:id', authenticate, ctrl.update(MouUpdate));
router.delete('/:id', authenticate, ctrl.remove(MouUpdate));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(MouUpdate));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(MouUpdate));

export default router;