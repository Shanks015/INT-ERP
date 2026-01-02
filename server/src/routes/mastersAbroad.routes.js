import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import MastersAbroad from '../models/MastersAbroad.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(MastersAbroad));
router.get('/stats', authenticate, ctrl.getStats(MastersAbroad));
router.get('/:id', authenticate, ctrl.getById(MastersAbroad));
router.post('/', authenticate, ctrl.create(MastersAbroad));
router.put('/:id', authenticate, ctrl.update(MastersAbroad));
router.delete('/:id', authenticate, ctrl.remove(MastersAbroad));
router.post('/export-csv', authenticate, ctrl.exportCSV(MastersAbroad));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(MastersAbroad));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(MastersAbroad));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(MastersAbroad));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(MastersAbroad));

export default router;
