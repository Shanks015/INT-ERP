import mongoose from 'mongoose';

const outreachSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    university:        String,
    contactPerson:     String,
    contactName:       String,
    email:             String,
    phone:             String,
    website:           String,
    partnershipType:   String,
    reply:             String, // kept as notes/comments only — not used for automation
    notes:             String,
    department:        String,
    alternativeEmails: [String],

    // ── Approval workflow ──────────────────────────────────────────────
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['active', 'pending_edit', 'pending_delete'],
        default: 'active'
    },
    pendingChanges: mongoose.Schema.Types.Mixed,
    deletionReason: String,

    // ── Outreach tracking ──────────────────────────────────────────────
    sentByEmployee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    sentFromEmail: { type: String, trim: true, default: null },
    sentDate:      { type: Date, default: null },

    // Outreach conversation state (separate from approval workflow)
    outreachStatus: {
        type: String,
        enum: ['Not Sent', 'Pending Partner Review', 'Reply Detected', 'Replied', 'Closed'],
        default: 'Not Sent'
    },

    // ── Follow-up automation ───────────────────────────────────────────
    automationActive: { type: Boolean, default: false },
    lastReminderAt:   { type: Date, default: null },
    remindersSent: [{
        milestone: { type: Number, enum: [14, 28] },
        sentAt:    { type: Date }
    }],

    // ── Reply detection (IMAP sync — two-step workflow) ─────────────────
    replyDetectedAt:      { type: Date,   default: null },
    replyFromEmail:       { type: String, default: null },
    replySubject:         { type: String, default: null },
    replyMessageId:       { type: String, default: null }, // for deduplication
    replyBodyContent:     { type: String, default: null }, // plain-text body of the reply
    replyMatchConfidence: {
        type: String,
        enum: ['high', 'low'],
        default: null
    },
    replyReviewStatus: {
        type: String,
        enum: ['pending_review', 'confirmed', 'rejected'],
        default: null
    },
    replyDetectedIn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }, // which employee's inbox saw the reply
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    reviewedAt: { type: Date, default: null },
    syncSource: {
        type: String,
        enum: ['manual', 'imap_poll'],
        default: 'manual'
    },
    replyAttachments: [{
        filename:    { type: String },
        contentType: { type: String },
        path:        { type: String }
    }],
    detectedReplies: [{
        detectedAt:      { type: Date,   default: Date.now },
        fromEmail:       { type: String, default: null },
        subject:         { type: String, default: null },
        messageId:       { type: String, default: null },
        bodyContent:     { type: String, default: null },
        matchConfidence: { type: String, enum: ['high', 'low'], default: null },
        reviewStatus: {
            type: String,
            enum: ['pending_review', 'confirmed', 'rejected'],
            default: 'pending_review'
        },
        detectedIn: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: { type: Date, default: null },
        attachments: [{
            filename:    { type: String },
            contentType: { type: String },
            path:        { type: String }
        }]
    }],

    // ── Audit ─────────────────────────────────────────────────────────
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

export default mongoose.model('Outreach', outreachSchema);
