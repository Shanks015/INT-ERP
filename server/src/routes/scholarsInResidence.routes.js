import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import ScholarInResidence from '../models/ScholarInResidence.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(ScholarInResidence));
router.get('/:id', authenticate, ctrl.getById(ScholarInResidence));
router.post('/', authenticate, ctrl.create(ScholarInResidence));
router.put('/:id', authenticate, ctrl.update(ScholarInResidence));
router.delete('/:id', authenticate, ctrl.remove(ScholarInResidence));
router.post('/export-csv', authenticate, ctrl.exportCSV(ScholarInResidence));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(ScholarInResidence));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(ScholarInResidence));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(ScholarInResidence));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(ScholarInResidence));

export default router;
