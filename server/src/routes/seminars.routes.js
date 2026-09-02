import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import Seminar from '../models/Seminar.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(Seminar));
router.get('/export-csv', authenticate, ctrl.exportCSV(Seminar));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(Seminar));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(Seminar));

// Add date field config for filtering
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = { field: 'date' };
    next();
}, ctrl.getAll(Seminar));
router.get('/:id', authenticate, ctrl.getById(Seminar));
router.post('/', authenticate, ctrl.create(Seminar));
router.put('/:id', authenticate, ctrl.update(Seminar));
router.delete('/:id', authenticate, ctrl.remove(Seminar));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(Seminar));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(Seminar));

export default router;
