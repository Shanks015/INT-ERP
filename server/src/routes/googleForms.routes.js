import express from 'express';
import { handleFormSubmit } from '../controllers/googleForms.controller.js';
import { verifyWebhookSecret } from '../middleware/webhookAuth.js';

const router = express.Router();

// Webhook endpoint for Google Forms (called by Apps Script, not by a logged-in user).
// Protected by a shared secret rather than a JWT — see middleware/webhookAuth.js.
// The Apps Script must send GOOGLE_FORMS_WEBHOOK_SECRET as either the
// X-Webhook-Token header or a ?token= query param.
router.post('/webhook', verifyWebhookSecret, handleFormSubmit);

export default router;
