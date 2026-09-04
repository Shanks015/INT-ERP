import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as mailboxController from '../controllers/mailbox.controller.js';

const router = express.Router();

// PUBLIC: Google OAuth consent redirect returns the browser here with ?code= and
// no ERP JWT, so this route is registered BEFORE the auth middleware below.
router.get('/gmail/oauth/callback', mailboxController.gmailOauthCallback);

// Everyone can manage their OWN mailbox (self-service); admins additionally
// see and manage every employee's connection. Ownership is enforced per-route
// in the controller (mailbox.employee vs req.user._id).
router.use(authenticate);

router.get('/',                    mailboxController.getAllMailboxes);
router.post('/',                   mailboxController.createMailbox);
router.delete('/:id',              mailboxController.deleteMailbox);
router.post('/:id/sync',           mailboxController.triggerSync);
router.put('/:id/status',          mailboxController.updateMailboxStatus);
router.get('/gmail/auth-url',      mailboxController.gmailAuthUrl);

export default router;
