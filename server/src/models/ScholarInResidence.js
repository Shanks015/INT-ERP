import mongoose from 'mongoose';

const scholarInResidenceSchema = new mongoose.Schema({
    scholarName: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    university: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },
    summary: {
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

// Virtual field to check if scholarship has expired
scholarInResidenceSchema.virtual('isExpired').get(function () {
    if (!this.toDate) return false;
    const endOfToDate = new Date(this.toDate);
    endOfToDate.setHours(23, 59, 59, 999);
    return new Date() > endOfToDate;
});

// Pre-save middleware to auto-update recordStatus based on toDate
scholarInResidenceSchema.pre('save', function (next) {
    if (this.toDate) {
        const endOfToDate = new Date(this.toDate);
        endOfToDate.setHours(23, 59, 59, 999);
        if (new Date() > endOfToDate) {
            this.recordStatus = 'expired';
        } else {
            this.recordStatus = 'active';
        }
    }
    next();
});

export default mongoose.model('ScholarInResidence', scholarInResidenceSchema);
