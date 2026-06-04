import mongoose from 'mongoose';

const outreachReminderSchema = new mongoose.Schema({
    outreachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outreach',
        required: true,
        index: true
    },
    milestone:    { type: Number, enum: [14, 28], required: true },
    triggerType:  { type: String, enum: ['automation', 'manual'], required: true },
    emailTo:      { type: String, required: true },
    emailSubject: { type: String },
    success:      { type: Boolean, required: true },
    errorMessage: { type: String, default: null },
    sentAt:       { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('OutreachReminder', outreachReminderSchema);
