import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'view'],
        index: true
    },
    module: {
        type: String,
        required: true,
        index: true,
        enum: [
            'partners', 'events', 'conferences', 'campus-visits',
            'immersion-programs', 'mou-signing', 'scholars',
            'mou-updates', 'student-exchange', 'masters-abroad',
            'memberships', 'digital-media', 'outreach', 'users',
            'settings', 'auth'
        ]
    },
    targetId: {
        type: String,
        default: null
    },
    targetName: {
        type: String,
        default: null
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: null
    },
    path: {
        type: String,
        default: null
    },
    statusCode: {
        type: Number,
        default: 200
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
        expires: 7776000 // 90 days (in seconds) - MongoDB TTL index
    }
}, {
    timestamps: true
});

// Compound indexes for common query patterns
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ module: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function (data) {
    try {
        await this.create(data);
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw - logging should never break the application
    }
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
