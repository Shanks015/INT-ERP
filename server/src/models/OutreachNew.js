import mongoose from 'mongoose';

const outreachNewSchema = new mongoose.Schema({
    university: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    contactName: {
        type: String,
        trim: true,
        default: ''
    },
    contactPerson: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        required: true,
        trim: true
    },
    alternativeEmails: [{
        type: String,
        trim: true
    }],
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    website: {
        type: String,
        trim: true,
        default: ''
    },
    partnershipType: {
        type: String,
        trim: true,
        default: ''
    },
    department: {
        type: String,
        trim: true,
        default: ''
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    outreachStatus: {
        type: String,
        enum: ['Not Sent', 'Sent', 'Reply Received', 'Closed'],
        default: 'Not Sent'
    },
    hasUnreadReply: {
        type: Boolean,
        default: false
    },
    emails: [{
        messageId: { type: String },
        direction: { type: String, enum: ['sent', 'received'] },
        from: { type: String },
        to: { type: String },
        subject: { type: String },
        body: { type: String },
        sentAt: { type: Date, default: Date.now },
        sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        sentByName: { type: String },
        attachments: [{
            filename: { type: String },
            path: { type: String },
            contentType: { type: String }
        }]
    }],
    status: {
        type: String,
        enum: ['active', 'pending_edit', 'pending_delete'],
        default: 'active'
    },
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

export default mongoose.model('OutreachNew', outreachNewSchema);
