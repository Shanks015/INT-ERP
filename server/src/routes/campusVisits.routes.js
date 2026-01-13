import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import CampusVisit from '../models/CampusVisit.js';

const router = express.Router();

// Specific routes MUST come before /:id
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(CampusVisit));
router.get('/export-csv', authenticate, ctrl.exportCSV(CampusVisit));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(CampusVisit));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(CampusVisit));

// Add date field config for filtering
router.get('/', authenticate, (req, res, next) => {
    req.locals = req.locals || {};
    req.locals.dateFieldConfig = { field: 'date' };
    next();
}, ctrl.getAll(CampusVisit));
router.get('/:id', authenticate, ctrl.getById(CampusVisit));
router.post('/', authenticate, ctrl.create(CampusVisit));
router.put('/:id', authenticate, ctrl.update(CampusVisit));
router.delete('/:id', authenticate, ctrl.remove(CampusVisit));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(CampusVisit));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(CampusVisit));

export default router;
