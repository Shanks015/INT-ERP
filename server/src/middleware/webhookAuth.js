import crypto from 'crypto';

/**
 * Shared-secret authentication for inbound webhooks (Google Forms via Apps Script).
 *
 * Google Apps Script cannot hold a user JWT, so the regular `authenticate`
 * middleware does not apply. Instead the Apps Script sends a fixed secret,
 * accepted from any of:
 *
 *   - header  X-Webhook-Token: <secret>
 *   - header  Authorization: Bearer <secret>
 *   - query   ?token=<secret>
 *
 * ROLLOUT NOTE: when GOOGLE_FORMS_WEBHOOK_SECRET is unset the request is
 * allowed through and a warning is logged. This is deliberate so that
 * deploying this file does not break the live Google Form before the
 * Apps Script has been updated. Set the env var to enforce.
 */

// Constant-time compare so a caller cannot recover the secret byte-by-byte
// from response timing.
const safeEqual = (a, b) => {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
};

export const verifyWebhookSecret = (req, res, next) => {
    const secret = process.env.GOOGLE_FORMS_WEBHOOK_SECRET;

    if (!secret) {
        console.warn(
            '[webhookAuth] GOOGLE_FORMS_WEBHOOK_SECRET is not set — the Google Forms ' +
            'webhook is accepting UNAUTHENTICATED writes. Set this variable and add the ' +
            'matching token to the Apps Script to close it.'
        );
        return next();
    }

    const provided =
        req.header('X-Webhook-Token') ||
        req.header('Authorization')?.replace(/^Bearer /, '') ||
        req.query.token;

    if (!provided || !safeEqual(provided, secret)) {
        console.warn(`[webhookAuth] Rejected webhook call from ${req.ip}`);
        return res.status(401).json({ success: false, message: 'Invalid webhook token' });
    }

    next();
};
