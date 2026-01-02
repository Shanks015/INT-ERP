import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import Event from '../models/Event.js';

const router = express.Router();

router.get('/stats', authenticate, ctrl.getStats(Event));
router.get('/', authenticate, ctrl.getAll(Event));
router.get('/stats', authenticate, ctrl.getStats(Event));
router.get('/:id', authenticate, ctrl.getById(Event));
router.post('/', authenticate, ctrl.create(Event));
router.put('/:id', authenticate, ctrl.update(Event));
router.delete('/:id', authenticate, ctrl.remove(Event));
router.post('/export-csv', authenticate, ctrl.exportCSV(Event));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(Event));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(Event));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(Event));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(Event));

export default router;
