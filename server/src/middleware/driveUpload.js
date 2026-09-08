// driveUpload.js — multipart parsing for ERP Drive uploads. Unlike the profile
// uploader (5 MB, images only), Drive accepts any number of documents/photos/
// PDFs up to a configurable per-file cap, held in MEMORY so the driveService can
// forward the buffer straight to Google. Field name: `files` (array).
import multer from 'multer';

const MAX_MB = Math.max(1, Number(process.env.DRIVE_MAX_FILE_MB) || 25);
const MAX_FILES = 20;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_MB * 1024 * 1024, files: MAX_FILES }
});

export const maxDriveFileMB = MAX_MB;

// Wrap so a multer limit failure returns a readable 400 instead of leaking an
// unhandled error. Usage: router.post('/...', driveUpload, handler).
export const driveUpload = (req, res, next) => {
    upload.array('files', MAX_FILES)(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: `Each file must be ${MAX_MB} MB or smaller.` });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Too many files or an unexpected field. Upload files under the "files" field (max 20).' });
        }
        return res.status(400).json({ error: `Upload rejected: ${err.message}` });
    });
};
