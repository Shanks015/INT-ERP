import Notification from '../models/Notification.js';

// All endpoints act on req.user._id (ownership-scoped). Polled by the header
// bell every ~30 s, so keep each query cheap — a single countDocuments for the
// badge and a capped find for the dropdown.

// GET /  → latest 25 notifications for the current user.
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(25)
            .lean();

        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
};

// GET /unread-count → the bell badge.
export const getUnreadCount = async (req, res) => {
    try {
        const unread = await Notification.countDocuments({
            recipient: req.user._id,
            read: false
        });
        res.json({ success: true, unread });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ success: false, message: 'Error fetching unread count' });
    }
};

// POST /read-all → mark every unread notification read.
export const markAllRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );
        res.json({ success: true, updated: result.modifiedCount ?? 0 });
    } catch (error) {
        console.error('Error marking notifications read:', error);
        res.status(500).json({ success: false, message: 'Error marking notifications read' });
    }
};

// POST /:id/read → mark a single notification read (ownership-scoped).
export const markOneRead = async (req, res) => {
    try {
        const result = await Notification.updateOne(
            { _id: req.params.id, recipient: req.user._id, read: false },
            { $set: { read: true } }
        );
        if ((result.matchedCount ?? 0) === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ success: false, message: 'Error marking notification read' });
    }
};
