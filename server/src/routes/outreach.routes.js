import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import * as outreachController from '../controllers/outreach.controller.js';
import * as reminderController from '../controllers/outreachReminder.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

// ── Stats & export ────────────────────────────────────────────────────────────
router.get('/stats',      outreachController.getOutreachStats);
router.get('/export-csv', outreachController.exportOutreachCSV);
router.post('/import-csv', upload.single('file'), outreachController.importOutreachCSV);

// ── Admin approval workflow ───────────────────────────────────────────────────
router.get('/pending/all',           authorize(['admin']), outreachController.getOutreachPending);
router.post('/pending/:id/approve',  authorize(['admin']), outreachController.approveOutreach);
router.post('/pending/:id/reject',   authorize(['admin']), outreachController.rejectOutreach);

// ── Review queue (IMAP reply detections awaiting human review) ────────────────
router.get('/review-queue',               authorize(['admin']), reminderController.getReviewQueue);
router.post('/:id/confirm-reply',         authorize(['admin']), reminderController.confirmReply);
router.post('/:id/reject-reply',          authorize(['admin']), reminderController.rejectReply);

// ── Reminder management ───────────────────────────────────────────────────────
router.post('/:id/send-reminder',         authorize(['admin']), reminderController.sendManualReminder);
router.put('/:id/toggle-automation',      authorize(['admin']), reminderController.toggleAutomation);
router.get('/:id/reminders',              reminderController.getRecordReminders);

// ── Standard CRUD ─────────────────────────────────────────────────────────────
router.get('/',     outreachController.getAllOutreach);
router.get('/:id',  outreachController.getOutreachById);
router.post('/',    outreachController.createOutreach);
router.put('/:id',  outreachController.updateOutreach);
router.delete('/:id', outreachController.deleteOutreach);

export default router;

