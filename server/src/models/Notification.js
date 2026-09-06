import mongoose from 'mongoose';

// In-app notification, shown in the header bell. Not email/gmail-based — created
// at the moment a real in-app event happens (partner reply, sign-up, staged
// edit/delete, approve/reject decision, mailbox break) and surfaced only inside
// the ERP. Title/body/module/link are snapshotted at emit time so deleting the
// originating record can never break a notification.
const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Event class, matched against the recipient's in-app settings toggles
    // (User.notificationSettings.inApp.events). Keep in sync with those keys
    // and with client/src/components/NotificationsBell.jsx category meta.
    category: {
        type: String,
        required: true,
        enum: ['reply', 'approval', 'decision', 'status']
    },
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        default: ''
    },
    module: {
        type: String,
        default: null // human label, e.g. "Outreach Mail"
    },
    link: {
        type: String,
        default: null // client route to navigate to, e.g. "/outreach-new"
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

// Bell badge query + list ordering.
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
// Notifications age out after 90 days (same horizon as ActivityLog).
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model('Notification', notificationSchema);
