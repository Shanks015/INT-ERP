import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    type: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    dignitaries: {
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
    eventSummary: {
        type: String,
        trim: true
    },
    universityCountry: {
        type: String,
        trim: true
    },
    driveLink: {
        type: String,
        trim: true
    },
    driveLink: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Event', eventSchema);
