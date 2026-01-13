import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import DigitalMedia from '../models/DigitalMedia.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(DigitalMedia));
router.get('/export-csv', authenticate, ctrl.exportCSV(DigitalMedia));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(DigitalMedia));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(DigitalMedia));

// Add date field config for filtering
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = { field: 'date' };
    next();
}, ctrl.getAll(DigitalMedia));
router.get('/:id', authenticate, ctrl.getById(DigitalMedia));
router.post('/', authenticate, ctrl.create(DigitalMedia));
router.put('/:id', authenticate, ctrl.update(DigitalMedia));
router.delete('/:id', authenticate, ctrl.remove(DigitalMedia));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(DigitalMedia));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(DigitalMedia));

export default router;
