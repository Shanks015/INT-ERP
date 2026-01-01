import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import MouUpdate from '../models/MouUpdate.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(MouUpdate));
router.get('/:id', authenticate, ctrl.getById(MouUpdate));
router.post('/', authenticate, ctrl.create(MouUpdate));
router.put('/:id', authenticate, ctrl.update(MouUpdate));
router.delete('/:id', authenticate, ctrl.remove(MouUpdate));
router.post('/export-csv', authenticate, ctrl.exportCSV(MouUpdate));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(MouUpdate));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(MouUpdate));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(MouUpdate));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(MouUpdate));

export default router;
