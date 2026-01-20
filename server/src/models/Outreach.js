import mongoose from 'mongoose';

const outreachSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    university: String,
    contactPerson: String,
    contactName: String,
    email: String,
    phone: String,
    website: String,
    partnershipType: String,
    reply: String,
    notes: String,
    department: String,
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['active', 'pending_edit', 'pending_delete'],
        default: 'active'
    },
    pendingChanges: mongoose.Schema.Types.Mixed,
    deletionReason: String,
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

export default mongoose.model('Outreach', outreachSchema);
