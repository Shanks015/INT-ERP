import Outreach from '../models/Outreach.js';
import OutreachReminder from '../models/OutreachReminder.js';
import ActivityLog from '../models/ActivityLog.js';
import { sendEmail } from '../services/emailService.js';
import { buildReminderEmail } from '../services/outreachEmailTemplate.js';

// GET /api/outreach/review-queue — records with replyReviewStatus: pending_review
export const getReviewQueue = async (req, res) => {
    try {
        const records = await Outreach.find({ replyReviewStatus: 'pending_review' })
            .populate('sentByEmployee', 'name email')
            .populate('replyDetectedIn', 'name email')
            .populate('createdBy', 'name email')
            .sort({ replyDetectedAt: -1 });

        res.json({ data: records, total: records.length });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching review queue', error: err.message });
    }
};

// POST /api/outreach/:id/confirm-reply — admin confirms detection is genuine
export const confirmReply = async (req, res) => {
    try {
        const outreach = await Outreach.findById(req.params.id);
        if (!outreach) return res.status(404).json({ message: 'Record not found' });

        if (outreach.replyReviewStatus !== 'pending_review') {
            return res.status(400).json({ message: 'Record is not in pending review state' });
        }

        // Update the specific reply in detectedReplies if found
        if (outreach.detectedReplies && outreach.detectedReplies.length > 0) {
            const latestReply = outreach.detectedReplies.find(r => r.messageId === outreach.replyMessageId || r.reviewStatus === 'pending_review');
            if (latestReply) {
                latestReply.reviewStatus = 'confirmed';
                latestReply.reviewedBy = req.user._id;
                latestReply.reviewedAt = new Date();
            }
        }

        outreach.outreachStatus = 'Replied';
        outreach.replyReviewStatus = 'confirmed';
        outreach.reviewedBy = req.user._id;
        outreach.reviewedAt = new Date();
        outreach.automationActive = false;
        await outreach.save();

        await ActivityLog.logActivity({
            user:       req.user._id,
            userName:   req.user.name,
            action:     'update',
            module:     'outreach',
            targetId:   String(outreach._id),
            targetName: outreach.university || outreach.name,
            details:    { action: 'confirm_reply', replyFrom: outreach.replyFromEmail },
            method:     'POST',
            path:       `/api/outreach/${outreach._id}/confirm-reply`,
            statusCode: 200
        });

        res.json({ message: 'Reply confirmed. Record marked as Replied.', data: outreach });
    } catch (err) {
        res.status(500).json({ message: 'Error confirming reply', error: err.message });
    }
};

// POST /api/outreach/:id/reject-reply — admin marks detection as false positive
export const rejectReply = async (req, res) => {
    try {
        const outreach = await Outreach.findById(req.params.id);
        if (!outreach) return res.status(404).json({ message: 'Record not found' });

        // Update the specific reply in detectedReplies if found before clearing root fields
        if (outreach.detectedReplies && outreach.detectedReplies.length > 0) {
            const latestReply = outreach.detectedReplies.find(r => r.messageId === outreach.replyMessageId || r.reviewStatus === 'pending_review');
            if (latestReply) {
                latestReply.reviewStatus = 'rejected';
                latestReply.reviewedBy = req.user._id;
                latestReply.reviewedAt = new Date();
            }
        }

        // Reset to previous state and resume automation
        outreach.outreachStatus = 'Pending Partner Review';
        outreach.replyReviewStatus = 'rejected';
        outreach.automationActive = true; // resume follow-up reminders
        outreach.replyDetectedAt = null;
        outreach.replyFromEmail = null;
        outreach.replySubject = null;
        outreach.replyMessageId = null;
        outreach.replyMatchConfidence = null;
        outreach.replyDetectedIn = null;
        outreach.reviewedBy = req.user._id;
        outreach.reviewedAt = new Date();
        await outreach.save();

        await ActivityLog.logActivity({
            user:       req.user._id,
            userName:   req.user.name,
            action:     'update',
            module:     'outreach',
            targetId:   String(outreach._id),
            targetName: outreach.university || outreach.name,
            details:    { action: 'reject_reply_false_positive' },
            method:     'POST',
            path:       `/api/outreach/${outreach._id}/reject-reply`,
            statusCode: 200
        });

        res.json({ message: 'Marked as false positive. Record returned to Pending Partner Review.', data: outreach });
    } catch (err) {
        res.status(500).json({ message: 'Error rejecting reply', error: err.message });
    }
};

// POST /api/outreach/:id/send-reminder — manual follow-up email trigger
export const sendManualReminder = async (req, res) => {
    try {
        const { milestone } = req.body;
        if (![14, 28].includes(Number(milestone))) {
            return res.status(400).json({ message: 'milestone must be 14 or 28' });
        }

        const outreach = await Outreach.findById(req.params.id);
        if (!outreach) return res.status(404).json({ message: 'Record not found' });
        if (!outreach.email)  return res.status(400).json({ message: 'No email on this record' });

        const { subject, html } = buildReminderEmail(outreach, milestone);

        let success = false;
        let errorMessage = null;

        try {
            await sendEmail({ to: outreach.email, subject, html });
            success = true;
        } catch (emailErr) {
            errorMessage = emailErr.message;
        }

        await OutreachReminder.create({
            outreachId:   outreach._id,
            milestone:    Number(milestone),
            triggerType:  'manual',
            emailTo:      outreach.email,
            emailSubject: subject,
            success,
            errorMessage
        });

        if (success) {
            await ActivityLog.logActivity({
                user:       req.user._id,
                userName:   req.user.name,
                action:     'reminder',
                module:     'outreach',
                targetId:   String(outreach._id),
                targetName: outreach.university || outreach.name,
                details:    { milestone, triggerType: 'manual' },
                method:     'POST',
                path:       `/api/outreach/${outreach._id}/send-reminder`,
                statusCode: 200
            });
        }

        res.json({
            success,
            message: success ? `Day-${milestone} reminder sent to ${outreach.email}` : 'Email failed to send',
            error: errorMessage
        });
    } catch (err) {
        res.status(500).json({ message: 'Error sending manual reminder', error: err.message });
    }
};

// PUT /api/outreach/:id/toggle-automation
export const toggleAutomation = async (req, res) => {
    try {
        const { active } = req.body;
        if (typeof active !== 'boolean') {
            return res.status(400).json({ message: 'active must be true or false' });
        }

        const outreach = await Outreach.findByIdAndUpdate(
            req.params.id,
            { automationActive: active },
            { new: true }
        );
        if (!outreach) return res.status(404).json({ message: 'Record not found' });

        res.json({ message: `Automation ${active ? 'enabled' : 'disabled'}`, automationActive: outreach.automationActive });
    } catch (err) {
        res.status(500).json({ message: 'Error toggling automation', error: err.message });
    }
};

// GET /api/outreach/:id/reminders — reminder history for one record
export const getRecordReminders = async (req, res) => {
    try {
        const reminders = await OutreachReminder.find({ outreachId: req.params.id })
            .sort({ sentAt: -1 });
        res.json({ data: reminders });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching reminder history', error: err.message });
    }
};
