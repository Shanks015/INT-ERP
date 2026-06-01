import mongoose from 'mongoose';

const meetingTrackerSchema = new mongoose.Schema({
    meetingId: {
        type: String,
        trim: true
    },
    meetingTitle: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date
    },
    startTime: {
        type: String,
        trim: true
    },
    endTime: {
        type: String,
        trim: true
    },
    timezone: {
        type: String,
        trim: true
    },
    mode: {
        type: String,
        trim: true
    },
    platformLocation: {
        type: String,
        trim: true
    },
    hostOrganization: {
        type: String,
        trim: true
    },
    hostName: {
        type: String,
        trim: true
    },
    hostEmail: {
        type: String,
        trim: true
    },
    participants: {
        type: String,
        trim: true
    },
    keyAgenda: {
        type: String,
        trim: true
    },
    discussionSummary: {
        type: String,
        trim: true
    },
    actionItems: {
        type: String,
        trim: true
    },
    nextMeetingDate: {
        type: Date
    },
    driveLink: {
        type: String,
        trim: true
    },
    remarks: {
        type: String,
        trim: true
    },
    sheetMonth: {
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

export default mongoose.model('MeetingTracker', meetingTrackerSchema);
