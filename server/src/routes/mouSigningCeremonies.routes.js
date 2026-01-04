import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as ctrl from '../controllers/generic.controller.js';
import * as enhancedCtrl from '../controllers/enhancedStats.controller.js';
import MouSigningCeremony from '../models/MouSigningCeremony.js';

const router = express.Router();

router.get('/', authenticate, ctrl.getAll(MouSigningCeremony));
router.get('/stats', authenticate, enhancedCtrl.getEnhancedStats(MouSigningCeremony));
router.get('/:id', authenticate, ctrl.getById(MouSigningCeremony));
router.post('/', authenticate, ctrl.create(MouSigningCeremony));
router.put('/:id', authenticate, ctrl.update(MouSigningCeremony));
router.delete('/:id', authenticate, ctrl.remove(MouSigningCeremony));
router.post('/export-csv', authenticate, ctrl.exportCSV(MouSigningCeremony));
router.get('/pending/count', authenticate, authorize(['admin']), ctrl.getPendingCount(MouSigningCeremony));
router.get('/pending/all', authenticate, authorize(['admin']), ctrl.getAllPending(MouSigningCeremony));
router.post('/pending/:id/approve', authenticate, authorize(['admin']), ctrl.approve(MouSigningCeremony));
router.post('/pending/:id/reject', authenticate, authorize(['admin']), ctrl.reject(MouSigningCeremony));

export default router;
