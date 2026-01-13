import mongoose from 'mongoose';

const mouUpdateSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
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
    department: {
        type: String,
        trim: true
    },
    contactPerson: {
        type: String,
        trim: true
    },
    contactEmail: {
        type: String,
        trim: true
    },
    mouStatus: {
        type: String,
        trim: true
    },
    agreementType: {
        type: String,
        trim: true
    },
    term: {
        type: String,
        trim: true
    },
    validityStatus: {
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

export default mongoose.model('MouUpdate', mouUpdateSchema);
