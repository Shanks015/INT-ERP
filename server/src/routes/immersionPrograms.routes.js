import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import ImmersionProgram from '../models/ImmersionProgram.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(ImmersionProgram));
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(ImmersionProgram));
router.get('/:id', authenticate, ctrl.getById(ImmersionProgram));
router.post('/', authenticate, ctrl.create(ImmersionProgram));
router.put('/:id', authenticate, ctrl.update(ImmersionProgram));
router.delete('/:id', authenticate, ctrl.remove(ImmersionProgram));
router.post('/export-csv', authenticate, ctrl.exportCSV(ImmersionProgram));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(ImmersionProgram));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(ImmersionProgram));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(ImmersionProgram));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(ImmersionProgram));

export default router;
