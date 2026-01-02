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
    }
}, {
    timestamps: true
});

export default mongoose.model('ImmersionProgram', immersionProgramSchema);
