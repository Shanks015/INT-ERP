import mongoose from 'mongoose';

const campusVisitSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    visitorName: {
        type: String,
        required: true,
        trim: true
    },
    universityName: {
        type: String,
        required: true,
        trim: true
    },
    country: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    campus: {
        type: String,
        trim: true
    },
    summary: {
        type: String,
        trim: true
    },
    purpose: {
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

export default mongoose.model('CampusVisit', campusVisitSchema);
