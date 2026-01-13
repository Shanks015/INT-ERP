import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import StudentExchange from '../models/StudentExchange.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(StudentExchange));
router.get('/export-csv', authenticate, ctrl.exportCSV(StudentExchange));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(StudentExchange));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(StudentExchange));

// Add date range fields config for filtering
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = { isRange: true };
    next();
}, ctrl.getAll(StudentExchange));
router.get('/:id', authenticate, ctrl.getById(StudentExchange));
router.post('/', authenticate, ctrl.create(StudentExchange));
router.put('/:id', authenticate, ctrl.update(StudentExchange));
router.delete('/:id', authenticate, ctrl.remove(StudentExchange));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(StudentExchange));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(StudentExchange));

export default router;
