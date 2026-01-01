import mongoose from 'mongoose';

const mastersAbroadSchema = new mongoose.Schema({
    studentName: {
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
        required: true,
        trim: true
    },
    courseStudying: {
        type: String,
        trim: true
    },
    courseTenure: {
        type: String,
        trim: true
    },
    usnNumber: {
        type: String,
        trim: true
    },
    cgpa: {
        type: Number
    },
    schoolOfStudy: {
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

export default mongoose.model('MastersAbroad', mastersAbroadSchema);
