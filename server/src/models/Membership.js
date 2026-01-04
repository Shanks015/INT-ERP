import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    membershipStatus: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    summary: {
        type: String,
        trim: true
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    membershipDuration: {
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

// Virtual field to check if membership has expired
membershipSchema.virtual('isExpired').get(function () {
    if (!this.endDate) return false;
    return new Date() > new Date(this.endDate);
});

// Pre-save middleware to auto-update recordStatus based on endDate
membershipSchema.pre('save', function (next) {
    if (this.endDate && new Date() > new Date(this.endDate)) {
        this.recordStatus = 'expired';
    } else {
        this.recordStatus = 'active';
    }
    next();
});

export default mongoose.model('Membership', membershipSchema);
