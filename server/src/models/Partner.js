import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
    completedOn: {
        type: Date
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    university: {
        type: String,
        required: true,
        trim: true
    },
    school: {
        type: String,
        trim: true
    },
    mouStatus: {
        type: String,
        trim: true
    },
    activeStatus: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    contactPerson: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    phoneNumber: {
        type: String,
        trim: true
    },
    agreementType: {
        type: String,
        trim: true
    },
    link: {
        type: String,
        trim: true
    },
    submitted: {
        type: Date
    },
    signingDate: {
        type: Date
    },
    expiringDate: {
        type: Date
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

partnerSchema.virtual('isExpired').get(function () {
    if (!this.expiringDate) return false;
    return new Date() > new Date(this.expiringDate);
});

partnerSchema.pre('save', function (next) {
    if (this.expiringDate && new Date() > new Date(this.expiringDate)) {
        this.recordStatus = 'expired';
    } else {
        this.recordStatus = 'active';
    }
    next();
});

export default mongoose.model('Partner', partnerSchema);
