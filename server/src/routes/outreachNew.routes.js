import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import * as controller from '../controllers/outreachNew.controller.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

router.get('/', controller.getAllOutreachNew);
router.get('/stats', controller.getOutreachNewStats);
router.get('/countries', controller.getOutreachNewCountries);
router.get('/:id', controller.getOutreachNewById);
router.post('/', controller.createOutreachNew);
router.put('/:id', controller.updateOutreachNew);
router.delete('/:id', controller.deleteOutreachNew);

router.post('/import-xlsx', upload.single('file'), controller.importOutreachNewXLSX);
router.post('/:id/send-email', upload.array('attachments'), controller.sendOutreachNewEmail);
router.post('/:id/log-sent-email', controller.logSentEmail);
router.put('/:id/mark-read', controller.markAsRead);

export default router;
