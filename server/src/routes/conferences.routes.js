import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import Conference from '../models/Conference.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(Conference));
router.get('/stats', authenticate, ctrl.getStats(Conference));
router.get('/:id', authenticate, ctrl.getById(Conference));
router.post('/', authenticate, ctrl.create(Conference));
router.put('/:id', authenticate, ctrl.update(Conference));
router.delete('/:id', authenticate, ctrl.remove(Conference));
router.post('/export-csv', authenticate, ctrl.exportCSV(Conference));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(Conference));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(Conference));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(Conference));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(Conference));

export default router;
