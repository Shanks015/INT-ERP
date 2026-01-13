import mongoose from 'mongoose';

const studentExchangeSchema = new mongoose.Schema({
    direction: {
        type: String,
        enum: ['Incoming', 'Outgoing'],
        required: true
    },
    studentName: {
        type: String,
        required: true,
        trim: true
    },
    exchangeUniversity: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    course: {
        type: String,
        trim: true
    },
    semesterYear: {
        type: String,
        trim: true
    },
    usnNo: {
        type: String,
        trim: true
    },
    fromDate: {
        type: Date
    },
    toDate: {
        type: Date
    },
    exchangeStatus: {
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

studentExchangeSchema.virtual('isExpired').get(function () {
    if (!this.toDate) return false;
    const endOfToDate = new Date(this.toDate);
    endOfToDate.setHours(23, 59, 59, 999);
    return new Date() > endOfToDate;
});

studentExchangeSchema.pre('save', function (next) {
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

export default mongoose.model('StudentExchange', studentExchangeSchema);
