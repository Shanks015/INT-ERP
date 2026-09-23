// drive.controller.js — the STORAGE surface of the ERP Drive feature.
//
// Design posture (approved plan #113):
//   • One office Google account owns the storage; the server acts as it for every
//     call (credential read from server config — see driveService.getAccessToken),
//     so no employee needs their own Google authorization.
//   • Any approved user may upload files to a record (additive). Deleting is
//     limited to the uploader or an admin (provenance rows below).
//   • There is NO in-app connect/disconnect: the credential is a deployment
//     setting (office account's refresh token, or a Workspace service-account
//     key). While it is absent, every data endpoint answers { connected:false }
//     and Drive is never touched — safe to deploy inert.
import mongoose from 'mongoose';
import DriveFile from '../models/DriveFile.js';
import ActivityLog from '../models/ActivityLog.js';
import {
    DRIVE_MODULES,
    parseFolderRef,
    folderUrl,
    isDriveConfigured,
    getAccessToken,
    ensureRecordFolder,
    listFilesInFolder,
    uploadBufferToFolder,
    deleteDriveFile
} from '../services/driveService.js';

// DRIVE_MODULES slugs -> ActivityLog.module enum value (the log schema whitelists
// canonical names). `mou-signing-ceremonies` logs as `mou-signing`; the three
// visit modules log as `campus-visits`; meeting-trackers has no enum entry, so it
// logs nothing (logActivity swallows, but we skip rather than spam stderr).
const ACTIVITY_MODULE = {
    'campus-visits': 'campus-visits',
    'seminars': 'campus-visits',
    'consultant-visits': 'campus-visits',
    'events': 'events',
    'mou-signing-ceremonies': 'mou-signing',
    'conferences': 'conferences',
    'scholars-in-residence': 'scholars',
    'mou-updates': 'mou-updates',
    'immersion-programs': 'immersion-programs',
    'student-exchange': 'student-exchange',
    'masters-abroad': 'masters-abroad',
    'memberships': 'memberships',
    'digital-media': 'digital-media'
    // meeting-trackers intentionally omitted (no enum value)
};

const loadModel = async (slug) => {
    const cfg = DRIVE_MODULES[slug];
    if (!cfg) {
        const err = new Error(`Unknown drive module: ${slug}`);
        err.status = 404;
        throw err;
    }
    const { default: Model } = await import(`../models/${cfg.model}.js`);
    return { Model, cfg };
};

const asObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

// Human identifier for audit rows / errors, from the module's labelKeys.
const recordLabel = (record, cfg) => {
    for (const k of cfg.labelKeys) {
        const v = record[k];
        if (v && String(v).trim()) return String(v).trim().slice(0, 90);
    }
    return `Record ${String(record._id).slice(-6)}`;
};

const logUpload = (req, slug, count, folderId, targetId, targetName) => {
    const module = ACTIVITY_MODULE[slug];
    if (!module) return;
    ActivityLog.logActivity({
        user: req.user._id,
        userName: req.user.name,
        action: 'create',
        module,
        targetId,
        targetName,
        details: { driveUpload: true, count, folderId },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        method: req.method,
        path: req.path,
        statusCode: 200
    });
};

// Map an internal Drive error to an HTTP response (keeps handlers uniform).
const driveError = (res, err) => {
    if (err.code === 'DRIVE_NOT_CONFIGURED') {
        return res.status(409).json({ connected: false, message: err.message });
    }
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('[Drive]', err.message);
    return res.status(502).json({ message: err.message });
};

// Fold Drive live files with our provenance rows so the client knows whether the
// current user may delete each one (admin or original uploader).
const decorateFiles = async (files, slug, recordId, req) => {
    const rows = await DriveFile.find({ module: slug, recordId }).lean();
    const byId = new Map(rows.map((r) => [r.fileId, r]));
    return files.map((f) => {
        const row = byId.get(f.id);
        const isUploader = row && String(row.uploadedBy) === String(req.user._id);
        return {
            id: f.id,
            name: f.name,
            mimeType: f.mimeType || null,
            size: f.size ? Number(f.size) : null,
            modifiedTime: f.modifiedTime || null,
            webViewLink: f.webViewLink || null,
            webContentLink: f.webContentLink || null,
            thumbnailLink: f.thumbnailLink || null,
            iconLink: f.iconLink || null,
            fileExtension: f.fileExtension || null,
            uploadedAt: row?.uploadedAt || null,
            canDelete: req.user.role === 'admin' || isUploader
        };
    });
};

const getRecordFolderRef = (record) => {
    const ref = parseFolderRef(record.driveLink);
    return ref?.kind === 'folder' ? ref : null;
};

// GET /api/drive/status — is the ERP Drive configured? Read-only; reflects the
// server credential source (no DB, no actions). Useful for ops checks.
export const getDriveStatus = async (req, res) => {
    try {
        const hasCredentials = isDriveConfigured();
        const actingAs = process.env.GOOGLE_DRIVE_IMPERSONATE || null;
        const hasKey = !!(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT);
        const mode = hasKey ? 'service-account' : process.env.GOOGLE_DRIVE_REFRESH_TOKEN ? 'oauth-token' : null;
        res.json({ connected: hasCredentials, mode, actingAs });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/drive/:module/:recordId — list the files in the record's folder (live
// from Drive, so office-added files appear too). Inert when not configured.
export const getRecordFiles = async (req, res) => {
    try {
        const { module: slug, recordId } = req.params;
        const rid = asObjectId(recordId);
        if (!rid) return res.status(400).json({ message: 'Invalid record id' });
        if (!isDriveConfigured()) {
            return res.json({ connected: false, folder: null, files: [] });
        }

        const { Model } = await loadModel(slug);
        const record = await Model.findById(rid).lean();
        if (!record) return res.status(404).json({ message: 'Record not found' });

        const ref = getRecordFolderRef(record);
        if (!ref) {
            return res.json({ connected: true, folder: null, files: [], driveLink: record.driveLink || null });
        }
        const accessToken = await getAccessToken();
        const live = await listFilesInFolder(accessToken, ref.id);
        const files = await decorateFiles(live, slug, rid, req);
        res.json({ connected: true, folder: { id: ref.id, url: folderUrl(ref.id) }, files });
    } catch (err) {
        driveError(res, err);
    }
};

// POST /api/drive/:module/:recordId/files — upload one or more files for a record.
// Body is multipart (driveUpload middleware) under field `files`. When the record
// has no real folder link yet, this lazily creates `ERP-Automation/<Module>/<YYYY>/<MMM>/<record>` and writes its URL into the record's driveLink.
export const uploadRecordFiles = async (req, res) => {
    try {
        const { module: slug, recordId } = req.params;
        const rid = asObjectId(recordId);
        if (!rid) return res.status(400).json({ message: 'Invalid record id' });
        if (!req.files || !req.files.length) {
            return res.status(400).json({ message: 'Choose at least one file to upload.' });
        }
        if (!isDriveConfigured()) {
            return res.status(409).json({ connected: false, message: 'The ERP Drive is not configured on this server.' });
        }

        const { Model, cfg } = await loadModel(slug);
        const record = await Model.findById(rid).lean();
        if (!record) return res.status(404).json({ message: 'Record not found' });

        // Resolve (or lazily create) the record folder. Reuses an existing
        // driveLink folder untouched (including old-layout trees); creates a
        // module/year/month/record tree when the link is absent or a single file.
        const folder = await ensureRecordFolder({ moduleKey: slug, record, recordId: rid });

        // Persist the created link back onto the record (only when it wasn't a
        // real folder already) — this is how empty driveLinks get populated.
        const ref = getRecordFolderRef(record);
        if (!ref && String(record.driveLink || '') !== folder.url) {
            await Model.updateOne({ _id: rid }, { $set: { driveLink: folder.url } });
        }

        const accessToken = await getAccessToken();
        const uploaded = [];
        for (const f of req.files) {
            const meta = await uploadBufferToFolder(accessToken, {
                folderId: folder.folderId,
                name: f.originalname || `upload-${Date.now()}`,
                mimeType: f.mimetype,
                buffer: f.buffer
            });
            await DriveFile.create({
                module: slug,
                recordId: rid,
                folderId: folder.folderId,
                fileId: meta.id,
                name: meta.name || f.originalname,
                mimeType: meta.mimeType || f.mimetype || null,
                size: meta.size ? Number(meta.size) : (f.size || null),
                uploadedBy: req.user._id
            });
            uploaded.push({ id: meta.id, name: meta.name, mimeType: meta.mimeType });
        }

        logUpload(req, slug, uploaded.length, folder.folderId, String(rid), recordLabel(record, cfg));

        const live = await listFilesInFolder(accessToken, folder.folderId);
        const files = await decorateFiles(live, slug, rid, req);
        res.json({
            message: `${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded`,
            folder: { id: folder.folderId, url: folder.url },
            files
        });
    } catch (err) {
        driveError(res, err);
    }
};

// DELETE /api/drive/:module/:recordId/files/:fileId — remove a file the current
// user uploaded, or any file when the user is an admin. Deletes on Drive AND the
// provenance row so the delete stays enforceable and auditable.
export const deleteRecordFile = async (req, res) => {
    try {
        const { module: slug, recordId, fileId } = req.params;
        const rid = asObjectId(recordId);
        if (!rid) return res.status(400).json({ message: 'Invalid record id' });
        if (!isDriveConfigured()) {
            return res.status(409).json({ connected: false, message: 'The ERP Drive is not configured on this server.' });
        }

        const row = await DriveFile.findOne({ module: slug, recordId: rid, fileId });
        const isUploader = row && String(row.uploadedBy) === String(req.user._id);
        if (!isUploader && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only delete files you uploaded.' });
        }

        const accessToken = await getAccessToken();
        await deleteDriveFile(accessToken, fileId);
        if (row) await DriveFile.deleteOne({ _id: row._id });
        res.json({ message: 'File deleted' });
    } catch (err) {
        driveError(res, err);
    }
};
