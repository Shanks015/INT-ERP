import mongoose from 'mongoose';

const digitalMediaSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    channel: {
        type: String,
        trim: true
    },
    articleTopic: {
        type: String,
        required: true,
        trim: true
    },
    articleLink: {
        type: String,
        trim: true
    },
    amountPaid: {
        type: String,
        trim: true
    },
    summary: {
        type: String,
        trim: true
    },
    driveLink: {
        type: String,
        trim: true
    },
    // Approval workflow fields
    status: {
        type: String,
        enum: ['active', 'pending_edit', 'pending_delete'],
        default: 'active'
    },
    pendingChanges: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    deletionReason: {
        type: String,
        default: null
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

export default mongoose.model('DigitalMedia', digitalMediaSchema);
