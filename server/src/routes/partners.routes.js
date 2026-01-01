import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import Partner from '../models/Partner.js';

const router = express.Router();

// Standard CRUD routes
router.get('/', authenticate, ctrl.getAll(Partner));
router.get('/:id', authenticate, ctrl.getById(Partner));
router.post('/', authenticate, ctrl.create(Partner));
router.put('/:id', authenticate, ctrl.update(Partner));
router.delete('/:id', authenticate, ctrl.remove(Partner));

// Export route
router.post('/export-csv', authenticate, ctrl.exportCSV(Partner));

// Admin-only routes
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(Partner));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(Partner));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(Partner));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(Partner));

export default router;
