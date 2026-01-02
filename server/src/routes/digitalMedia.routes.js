import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import DigitalMedia from '../models/DigitalMedia.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(DigitalMedia));
router.get('/stats', authenticate, ctrl.getStats(DigitalMedia));
router.get('/:id', authenticate, ctrl.getById(DigitalMedia));
router.post('/', authenticate, ctrl.create(DigitalMedia));
router.put('/:id', authenticate, ctrl.update(DigitalMedia));
router.delete('/:id', authenticate, ctrl.remove(DigitalMedia));
router.post('/export-csv', authenticate, ctrl.exportCSV(DigitalMedia));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(DigitalMedia));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(DigitalMedia));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(DigitalMedia));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(DigitalMedia));

export default router;
