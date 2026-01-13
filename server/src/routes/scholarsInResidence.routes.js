import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import ScholarInResidence from '../models/ScholarInResidence.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(ScholarInResidence));
router.get('/export-csv', authenticate, ctrl.exportCSV(ScholarInResidence));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(ScholarInResidence));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(ScholarInResidence));

// Add date range fields config for filtering
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = { isRange: true };
    next();
}, ctrl.getAll(ScholarInResidence));
router.get('/:id', authenticate, ctrl.getById(ScholarInResidence));
router.post('/', authenticate, ctrl.create(ScholarInResidence));
router.put('/:id', authenticate, ctrl.update(ScholarInResidence));
router.delete('/:id', authenticate, ctrl.remove(ScholarInResidence));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(ScholarInResidence));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(ScholarInResidence));

export default router;
