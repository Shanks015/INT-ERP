import mongoose from 'mongoose';

const immersionProgramSchema = new mongoose.Schema({
    direction: {
        type: String,
        enum: ['Incoming', 'Outgoing'],
        required: true
    },
    programStatus: {
        type: String,
        trim: true
    },
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
    numberOfPax: {
        type: Number,
        default: 0
    },
    department: {
        type: String,
        trim: true
    },
    arrivalDate: {
        type: Date
    },
    departureDate: {
        type: Date
    },
    summary: {
        type: String,
        trim: true
    },
    feesPerPax: {
        type: Number
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

immersionProgramSchema.virtual('isExpired').get(function () {
    if (!this.departureDate) return false;
    const endOfDepartureDate = new Date(this.departureDate);
    endOfDepartureDate.setHours(23, 59, 59, 999);
    return new Date() > endOfDepartureDate;
});

immersionProgramSchema.pre('save', function (next) {
    if (this.departureDate) {
        const endOfDepartureDate = new Date(this.departureDate);
        endOfDepartureDate.setHours(23, 59, 59, 999);
        if (new Date() > endOfDepartureDate) {
            this.recordStatus = 'expired';
        } else {
            this.recordStatus = 'active';
        }
    }
    next();
});

export default mongoose.model('ImmersionProgram', immersionProgramSchema);
