import mongoose from 'mongoose';

const mailboxConnectionSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    employeeName:  { type: String, required: true },
    emailAddress:  { type: String, required: true },
    appPassword:   { type: String, required: true }, // AES-256 encrypted
    imapHost:      { type: String, default: 'imap.gmail.com' },
    imapPort:      { type: Number, default: 993 },
    status: {
        type: String,
        enum: ['active', 'error', 'disconnected'],
        default: 'active'
    },
    lastSyncAt:    { type: Date, default: null },
    lastErrorAt:   { type: Date, default: null },
    lastError:     { type: String, default: null },
    totalMatched:  { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('MailboxConnection', mailboxConnectionSchema);
