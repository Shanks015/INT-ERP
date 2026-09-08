// driveService.js — the STORAGE leg of the ERP Drive: one office Google account
// owns a folder tree (`INT-ERP Files / <Module> / <MMM YYYY> / <record>`) and the
// server performs every Drive call as that account, so employees upload from the
// ERP UI without their own Google authorization. No extra dependency: token
// acquisition + Drive v3 REST + multipart upload all ride on Node's global fetch,
// mirroring services/gmailSendService.js.
//
// Credentials come from SERVER CONFIG, never the app UI. Two supported sources:
//   1) GOOGLE_DRIVE_REFRESH_TOKEN — the office account consents once during setup
//      (see scripts/drive_connect.mjs) and this env secret lets the server act as
//      it, refreshed via the existing Google OAuth client (gmailSendService).
//   2) GOOGLE_DRIVE_SERVICE_ACCOUNT (JSON string) or GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE
//      (path) + optional GOOGLE_DRIVE_IMPERSONATE — Workspace domain-wide
//      delegation: no consent screen ever, acts as the impersonated office email.
// With neither source every endpoint answers "not configured" and Drive is never
// touched (safe to deploy inert).
import fs from 'fs';
import crypto from 'crypto';
import { isGmailConfigured, refreshAccessToken } from './gmailSendService.js';

const FILES    = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD   = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// Full Drive scope = read/create/edit/delete everything on the office account —
// required because the ERP must also manage pre-existing office folders (e.g. the
// Scholars folders created by hand). drive.file would hide files the app never
// opened.
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive';

export const ROOT_FOLDER_NAME = 'INT-ERP Files';

// Module slug -> Drive metadata. folderLabel names the module folder inside the
// root; labelKeys pick a human identifier for the record folder name; dateKey is
// the record's own date whose month-year makes the bucket (undefined => a module
// with no date, e.g. Masters Abroad — falls back to the upload month).
export const DRIVE_MODULES = {
    'campus-visits':         { model: 'CampusVisit',         folderLabel: 'Campus Visits',          labelKeys: ['universityName', 'visitorName'], dateKey: 'date' },
    'seminars':              { model: 'Seminar',             folderLabel: 'Seminars',               labelKeys: ['universityName', 'visitorName'], dateKey: 'date' },
    'consultant-visits':     { model: 'ConsultantVisit',     folderLabel: 'Consultant Visits',      labelKeys: ['universityName', 'visitorName'], dateKey: 'date' },
    'events':                { model: 'Event',               folderLabel: 'Events',                 labelKeys: ['title', 'eventSummary', 'universityCountry'], dateKey: 'date' },
    'mou-signing-ceremonies':{ model: 'MouSigningCeremony',  folderLabel: 'MoU Signing Ceremonies', labelKeys: ['university', 'visitorName'], dateKey: 'date' },
    'conferences':           { model: 'Conference',          folderLabel: 'Conferences',            labelKeys: ['conferenceName', 'eventSummary'], dateKey: 'date' },
    'scholars-in-residence': { model: 'ScholarInResidence',  folderLabel: 'Scholars-in-Residence',  labelKeys: ['scholarName', 'university'], dateKey: 'startDate' },
    'mou-updates':           { model: 'MouUpdate',           folderLabel: 'MoU Updates',            labelKeys: ['university', 'contactPerson'], dateKey: 'date' },
    'immersion-programs':    { model: 'ImmersionProgram',    folderLabel: 'Immersion Programs',     labelKeys: ['university', 'studentName'], dateKey: 'arrivalDate' },
    'student-exchange':      { model: 'StudentExchange',     folderLabel: 'Student Exchange',       labelKeys: ['studentName', 'exchangeUniversity'], dateKey: 'fromDate' },
    'masters-abroad':        { model: 'MastersAbroad',       folderLabel: 'Masters Abroad',         labelKeys: ['studentName', 'university', 'schoolOfStudy'], dateKey: null },
    'memberships':           { model: 'Membership',          folderLabel: 'Memberships',            labelKeys: ['name'], dateKey: 'startDate' },
    'digital-media':         { model: 'DigitalMedia',        folderLabel: 'Digital Media',          labelKeys: ['channel', 'articleTopic'], dateKey: 'date' },
    'meeting-trackers':      { model: 'MeetingTracker',      folderLabel: 'Meeting Trackers',       labelKeys: ['meetingTitle', 'hostOrganization', 'hostName'], dateKey: 'date' }
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Folders are readable by anyone with the link so every staff member can open /
// preview files the ERP placed there (record folders the ERP creates only — never
// pre-existing office folders).
const setAnyoneReader = async (accessToken, fileId) => {
    const r = await fetch(`${FILES}/${fileId}/permissions?fields=id`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
    if (!r.ok && r.status !== 409) { // 409 = permission already exists
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error?.message || `Failed to share folder (${r.status})`);
    }
};

// Pure helpers ----------------------------------------------------------------

// Does a stored driveLink point at a FOLDER (upload/list target) or a FILE (not a
// container)? Returns { kind, id } or null when the string is not a Drive URL.
export const parseFolderRef = (link) => {
    const s = String(link || '');
    const folder = s.match(/\/folders\/([A-Za-z0-9_-]{6,})/);
    if (folder) return { kind: 'folder', id: folder[1] };
    const file = s.match(/\/file\/d\/([A-Za-z0-9_-]{6,})/);
    if (file) return { kind: 'file', id: file[1] };
    return null;
};

// Drive folder names cannot contain \ / : * ? " < > | or control characters.
export const sanitizeFolderName = (name) => {
    const s = String(name || '')
        .replace(/[\\/:*?"<>|]/g, ' ')      // Drive-forbidden punctuation
        .replace(/\s+/g, ' ')
        .replace(/^[.\s]+|[.\s]+$/g, '')
        .trim()
        .slice(0, 80);
    return s || 'Record';
};

export const folderUrl = (id) => `https://drive.google.com/drive/folders/${id}`;

// "Sep 2026" bucket from a date (UTC to match the dd/MMM/yyyy display policy).
export const monthBucket = (date) => {
    const d = date && !isNaN(new Date(date)) ? new Date(date) : new Date();
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const escapeQ = (name) => String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Credential layer -------------------------------------------------------------

// Read the service-account JSON key from a mounted file or an env string. Returns
// null when neither is set/valid (feature stays inert).
const loadServiceAccountCredentials = () => {
    let creds = null;
    const file = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE;
    const inline = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
    if (file) {
        try { creds = JSON.parse(fs.readFileSync(file, 'utf8')); }
        catch { /* missing/unreadable -> fall through to the env string */ }
    }
    if (!creds && inline) {
        try { creds = JSON.parse(inline); }
        catch { /* malformed -> treated as unconfigured */ }
    }
    return creds && creds.client_email && creds.private_key ? creds : null;
};

export const isDriveConfigured = () => !!(
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN ||
    loadServiceAccountCredentials()
);

// Build the JWT assertion a service account exchanges for an access token
// (Google's JWT-bearer grant). `subject` impersonates a Workspace user when the
// account is domain-delegated. Pure + exported for unit tests.
export const buildServiceAccountJwt = ({ clientEmail, privateKey, subject, scope = DRIVE_SCOPES, audience = TOKEN_ENDPOINT, nowSec }) => {
    const iat = nowSec || Math.floor(Date.now() / 1000);
    const claims = { iss: clientEmail, scope, aud: audience, iat, exp: iat + 3600 };
    if (subject) claims.sub = subject;
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const input = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`;
    const sig = crypto.createSign('RSA-SHA256').update(input).sign(privateKey);
    return `${input}.${sig.toString('base64url')}`;
};

// Access tokens are cached in memory until about a minute before expiry.
let saTokenCache = null; // { token, expiresAt }

const serviceAccountAccessToken = async (creds) => {
    if (saTokenCache && saTokenCache.expiresAt > Date.now() + 60_000) return saTokenCache.token;
    const assertion = buildServiceAccountJwt({
        clientEmail: creds.client_email,
        privateKey: creds.private_key,
        subject: process.env.GOOGLE_DRIVE_IMPERSONATE || undefined
    });
    const body = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
    });
    const r = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error_description || j.error || 'service-account token exchange failed') + ` (${r.status})`);
    saTokenCache = {
        token: j.access_token,
        expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000
    };
    return j.access_token;
};

// Access token for the office account: service-account (delegation) when a key is
// configured, else the setup-time refresh token. Throws DRIVE_NOT_CONFIGURED when
// the server has neither source.
export const getAccessToken = async () => {
    const creds = loadServiceAccountCredentials();
    if (creds) return serviceAccountAccessToken(creds);
    if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
        if (!isGmailConfigured()) {
            throw new Error('GOOGLE_DRIVE_REFRESH_TOKEN is set but the Google OAuth client (GOOGLE_CLIENT_ID/SECRET) is missing.');
        }
        return refreshAccessToken(process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
    }
    const err = new Error('The ERP Drive is not configured on this server. An administrator must set a Drive credential in the server configuration.');
    err.code = 'DRIVE_NOT_CONFIGURED';
    throw err;
};

// Drive REST helpers (each takes an already-acquired access token) ----------------

export const driveFetch = async (accessToken, { method = 'GET', url, query = '', json, buffer, contentType }) => {
    const sep = url.includes('?') ? '&' : '?';
    const r = await fetch(`${url}${query ? sep + query : ''}`, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(contentType ? { 'Content-Type': contentType } : {})
        },
        body: json !== undefined ? JSON.stringify(json) : buffer
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const reason = j.error?.message || j.error?.code || 'unknown';
        if (r.status === 401) throw new Error('Drive authorization expired. Re-run the Drive setup (office account). (' + reason + ')');
        throw new Error(`Drive request failed: ${reason} (${r.status})`);
    }
    return j;
};

export const createFolder = (accessToken, { name, parentId }) =>
    driveFetch(accessToken, {
        method: 'POST',
        url: FILES,
        query: 'fields=id,name,mimeType',
        json: { name, mimeType: FOLDER_MIME, parents: parentId ? [parentId] : [] }
    });

export const findFolderByName = async (accessToken, { name, parentId }) => {
    const j = await driveFetch(accessToken, {
        url: FILES,
        query: `q=${encodeURIComponent(`'${escapeQ(parentId)}' in parents and name='${escapeQ(name)}' and mimeType='${FOLDER_MIME}' and trashed=false`)}&fields=files(id,name)&pageSize=1&corpora=user&spaces=drive&supportsAllDrives=true`
    });
    return j.files?.[0]?.id || null;
};

// Ensure a folder exists under parent and return its id (find then create).
const ensureFolder = async (accessToken, { name, parentId }) => {
    const existing = await findFolderByName(accessToken, { name, parentId });
    if (existing) return existing;
    const created = await createFolder(accessToken, { name, parentId });
    return created.id;
};

// List the files directly inside a folder (live — reflects files the office adds
// in Drive too). Never throws when the folder is empty.
export const listFilesInFolder = async (accessToken, folderId) => {
    const j = await driveFetch(accessToken, {
        url: FILES,
        query: `q=${encodeURIComponent(`'${escapeQ(folderId)}' in parents and trashed=false`)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink,fileExtension)&pageSize=1000&orderBy=modifiedTime desc&corpora=user&spaces=drive&supportsAllDrives=true`
    });
    return j.files || [];
};

// multipart/related upload: JSON metadata part + raw file part.
export const uploadBufferToFolder = async (accessToken, { folderId, name, mimeType, buffer }) => {
    const boundary = '----int_erp_drive_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const meta = JSON.stringify({ name, parents: [folderId] });
    const CRLF = '\r\n';
    const parts = [];
    parts.push(`--${boundary}${CRLF}`);
    parts.push('Content-Type: application/json; charset=UTF-8' + CRLF + CRLF);
    parts.push(meta + CRLF);
    parts.push(`--${boundary}${CRLF}`);
    parts.push(`Content-Type: ${mimeType || 'application/octet-stream'}${CRLF}`);
    parts.push('Content-Transfer-Encoding: binary' + CRLF + CRLF);
    const head = Buffer.from(parts.join(''), 'utf8');
    const body = Buffer.concat([head, buffer, Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8')]);

    return driveFetch(accessToken, {
        method: 'POST',
        url: UPLOAD,
        query: 'uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,fileExtension',
        buffer: body,
        contentType: `multipart/related; boundary=${boundary}`
    });
};

export const deleteDriveFile = (accessToken, fileId) =>
    driveFetch(accessToken, { method: 'DELETE', url: `${FILES}/${fileId}`, query: 'supportsAllDrives=true' });

// Record-folder resolution ------------------------------------------------------

// "INT-ERP Files" root id, found-or-created once and cached in memory (re-found
// after a restart — no DB row holds it).
let cachedRootId = null;

const ensureRootFolder = async (accessToken) => {
    if (cachedRootId) return cachedRootId;
    let rootId = await findFolderByName(accessToken, { name: ROOT_FOLDER_NAME, parentId: 'root' });
    if (!rootId) rootId = (await createFolder(accessToken, { name: ROOT_FOLDER_NAME, parentId: 'root' })).id;
    cachedRootId = rootId;
    return rootId;
};

// Resolve the folder that holds a record's files:
//   - if the record's current driveLink points at a real Drive FOLDER, reuse it
//     (no duplicate folder, never re-shared) — the ERP uploads into the existing
//     office folder;
//   - otherwise create `INT-ERP Files / <Module> / <MMM YYYY> / <label> - <id>`
//     and share the leaf with anyone-with-the-link.
// Returns { folderId, url, created, reused }.
export const ensureRecordFolder = async ({ moduleKey, record, recordId }) => {
    const cfg = DRIVE_MODULES[moduleKey];
    if (!cfg) throw new Error(`Unknown drive module: ${moduleKey}`);

    const existingRef = parseFolderRef(record.driveLink);
    if (existingRef?.kind === 'folder') {
        return { folderId: existingRef.id, url: record.driveLink, created: false, reused: true };
    }

    const accessToken = await getAccessToken();
    const rootId = await ensureRootFolder(accessToken);

    // <Module> folder
    const moduleFolderId = await ensureFolder(accessToken, { name: cfg.folderLabel, parentId: rootId });

    // <MMM YYYY> bucket — the record's own date, upload month when absent.
    const bucketDate = cfg.dateKey ? record[cfg.dateKey] : null;
    const bucketId = await ensureFolder(accessToken, { name: monthBucket(bucketDate), parentId: moduleFolderId });

    // <record folder> leaf
    const label = cfg.labelKeys.map((k) => record[k]).find((v) => v && String(v).trim());
    const leafName = `${sanitizeFolderName(label || 'Record')} - ${String(recordId).slice(-6)}`;
    const leafId = await ensureFolder(accessToken, { name: leafName, parentId: bucketId });

    // New leaf only — make it openable by any staff member.
    await setAnyoneReader(accessToken, leafId).catch(() => {});

    return { folderId: leafId, url: folderUrl(leafId), created: true, reused: false };
};
