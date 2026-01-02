import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import CampusVisit from '../models/CampusVisit.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(CampusVisit));
router.get('/stats', authenticate, ctrl.getStats(CampusVisit));
router.get('/:id', authenticate, ctrl.getById(CampusVisit));
router.post('/', authenticate, ctrl.create(CampusVisit));
router.put('/:id', authenticate, ctrl.update(CampusVisit));
router.delete('/:id', authenticate, ctrl.remove(CampusVisit));
router.post('/export-csv', authenticate, ctrl.exportCSV(CampusVisit));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(CampusVisit));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(CampusVisit));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(CampusVisit));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(CampusVisit));

export default router;
