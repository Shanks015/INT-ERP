import mongoose from 'mongoose';

const mouSigningCeremonySchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        trim: true
    },
    visitorName: {
        type: String,
        required: true,
        trim: true
    },
    university: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    eventSummary: {
        type: String,
        trim: true
    },
    campus: {
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
    },
    // Record expiration status (separate from approval workflow)
    recordStatus: {
        type: String,
        enum: ['active', 'expired'],
        default: 'active'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field to check if record has expired
mouSigningCeremonySchema.virtual('isExpired').get(function () {
    // MoU ceremonies don't have end dates, so always active
    return false;
});

// Pre-save middleware to auto-update recordStatus
mouSigningCeremonySchema.pre('save', function (next) {
    // MoU ceremonies don't expire based on dates
    this.recordStatus = 'active';
    next();
});

export default mongoose.model('MouSigningCeremony', mouSigningCeremonySchema);
