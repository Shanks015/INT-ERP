import mongoose from 'mongoose';

// Scholar in Residence — schema aligned to the 15 data columns + Notes.
//   Scholar Name | Designation | University | Country | QS Ranking | Duration / Days |
//   Start Date | End Date | Schools / Department | Accommodation / Campus | Status |
//   Email | Mobile | Remarks / Summary | Drive Link | Notes
// Dates are stored as real Date objects and shown/parsed as dd/MMM/yyyy.
const scholarInResidenceSchema = new mongoose.Schema({
    scholarName: {
        type: String,
        required: true,
        trim: true
    },
    designation: {
        type: String,
        trim: true
    },
    university: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    qsRanking: {
        type: Number,
        min: 1
    },
    durationDays: {
        type: Number,
        min: 1
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    // Schools / Department (kept as `department` internally)
    department: {
        type: String,
        trim: true
    },
    // Accommodation / Campus (kept as `campus` internally)
    campus: {
        type: String,
        trim: true
    },
    // Status column (visit/engagement status, e.g. Completed / Ongoing).
    // Kept as `scholarStatus` so it never collides with the approval `status` field.
    scholarStatus: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
    },
    mobile: {
        type: String,
        trim: true
    },
    // Remarks / Summary (kept as `summary` internally)
    summary: {
        type: String,
        trim: true
    },
    driveLink: {
        type: String,
        trim: true
    },
    // Notes — short internal/tracking note (e.g. "Wrong link - should be
    // updated"). Kept separate from `summary`; shown as a list column.
    notes: {
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

// Virtual field to check if the visit/residency has ended
scholarInResidenceSchema.virtual('isExpired').get(function () {
    if (!this.endDate) return false;
    const endOfEndDate = new Date(this.endDate);
    endOfEndDate.setHours(23, 59, 59, 999);
    return new Date() > endOfEndDate;
});

// Pre-save middleware to auto-update recordStatus based on endDate
scholarInResidenceSchema.pre('save', function (next) {
    if (this.endDate) {
        const endOfEndDate = new Date(this.endDate);
        endOfEndDate.setHours(23, 59, 59, 999);
        if (new Date() > endOfEndDate) {
            this.recordStatus = 'expired';
        } else {
            this.recordStatus = 'active';
        }
    }
    next();
});

export default mongoose.model('ScholarInResidence', scholarInResidenceSchema);
