import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
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
    contactName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    reply: {
        type: String,
        trim: true
    },
    contactPerson: {
        type: String,
        trim: true
    },
    phoneNumber: {
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

export default mongoose.model('Partner', partnerSchema);
