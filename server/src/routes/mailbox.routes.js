import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as mailboxController from '../controllers/mailbox.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin'])); // All mailbox management is admin-only

router.get('/',            mailboxController.getAllMailboxes);
router.post('/',           mailboxController.createMailbox);
router.delete('/:id',      mailboxController.deleteMailbox);
router.post('/:id/sync',   mailboxController.triggerSync);
router.put('/:id/status',  mailboxController.updateMailboxStatus);

export default router;
