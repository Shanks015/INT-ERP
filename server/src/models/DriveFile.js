import mongoose from 'mongoose';

// Provenance/audit row for a file uploaded through the ERP into the office
// Drive. Listing is always read LIVE from Drive (so files the office adds
// manually appear too); this row exists so a delete can be authorized to the
// admin or the uploader, and so uploads are auditable. Removed when the file
// is deleted.
const driveFileSchema = new mongoose.Schema({
    module:    { type: String, required: true, index: true },  // module slug, e.g. 'events'
    recordId:  { type: mongoose.Schema.Types.ObjectId, required: true }, // the ERP record the file belongs to
    folderId:  { type: String, required: true },               // Drive folder id holding the file
    fileId:    { type: String, required: true },               // Drive file id
    name:      { type: String, required: true, trim: true },
    mimeType:  { type: String, default: null },
    size:      { type: Number, default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

driveFileSchema.index({ module: 1, recordId: 1 });
driveFileSchema.index({ fileId: 1 }, { unique: true });

export default mongoose.model('DriveFile', driveFileSchema);
