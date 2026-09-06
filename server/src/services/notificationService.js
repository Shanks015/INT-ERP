import User from '../models/User.js';
import Notification from '../models/Notification.js';

// In-app notification emission. Emit helpers NEVER throw — a notification
// failure must never break the request/job that triggered it (same contract as
// ActivityLog.logActivity). Emitting writes one (or a few) small documents for a
// real in-app event; there is no cron/bulk write path in this service.

export const NOTIFICATION_CATEGORIES = ['reply', 'approval', 'decision', 'status'];

// Shape used when a user has no stored in-app settings yet (defaults ON, so
// legacy accounts start receiving everything until they opt out).
export const DEFAULT_IN_APP_SETTINGS = {
    enabled: true,
    events: {
        reply: true,
        approval: true,
        decision: true,
        status: true
    }
};

// Gate: does this user accept in-app notifications of `category`?
// Pure + total — the unit-tested contract. Missing/partial settings blocks
// default to accepting (no DB migration needed).
export const userAccepts = (user, category) => {
    if (!user) return false;
    const inApp = user?.notificationSettings?.inApp;
    if (!inApp) return true;                       // legacy user, defaults ON
    if (inApp.enabled === false) return false;     // master switch off
    const events = inApp.events;
    if (!events) return true;                      // no per-event config → accept
    return events[category] !== false;             // explicit false opts out
};

// Build the raw document shape (pure, for tests/insertMany).
export const toNotificationDoc = ({ recipientId, category, title, body, module, link }) => ({
    recipient: recipientId,
    category,
    title: String(title ?? '').slice(0, 200),
    body: String(body ?? '').slice(0, 500),
    module: module || null,
    link: link || null,
    read: false
});

// Emit to a single recipient. Resolves their gate first (their settings are the
// per-account switch). Returns 1 when created, 0 when skipped/failed.
export const emitToUser = async ({ recipientId, category, title, body, module, link }) => {
    if (!recipientId || !category || !title) return 0;
    try {
        const recipient = await User.findById(recipientId).select('notificationSettings').lean();
        if (!recipient || !userAccepts(recipient, category)) return 0;
        await Notification.create(toNotificationDoc({ recipientId, category, title, body, module, link }));
        return 1;
    } catch (err) {
        console.error('[notify] emitToUser failed:', err.message);
        return 0;
    }
};

// Emit to every admin whose gate allows `category`. Recipients resolve against
// their own in-app settings, so only the events a given admin keeps on reach
// them. Returns how many notifications were created.
export const emitToAdmins = async ({ category, title, body, module, link, exceptUserId }) => {
    if (!category || !title) return 0;
    try {
        const admins = await User.find({ role: 'admin' }).select('notificationSettings').lean();
        const docs = admins
            .filter((a) => !exceptUserId || String(a._id) !== String(exceptUserId))
            .filter((a) => userAccepts(a, category))
            .map((a) => toNotificationDoc({ recipientId: a._id, category, title, body, module, link }));

        if (docs.length === 0) return 0;
        await Notification.insertMany(docs);
        return docs.length;
    } catch (err) {
        console.error('[notify] emitToAdmins failed:', err.message);
        return 0;
    }
};
