import mongoose from 'mongoose';

const socialMediaSchema = new mongoose.Schema({
    postName: {
        type: String,
        required: true,
        trim: true
    },
    caption: {
        type: String,
        trim: true
    },
    fbLink: {
        type: String,
        trim: true
    },
    instaLink: {
        type: String,
        trim: true
    },
    linkedinLink: {
        type: String,
        trim: true
    },
    vkLink: {
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export default mongoose.model('SocialMedia', socialMediaSchema);
