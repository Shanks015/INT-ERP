import mongoose from 'mongoose';

const studentExchangeSchema = new mongoose.Schema({
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
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
    course: {
        type: String,
        trim: true
    },
    semesterYear: {
        type: String,
        trim: true
    },
    exchangeStatus: {
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

export default mongoose.model('StudentExchange', studentExchangeSchema);
