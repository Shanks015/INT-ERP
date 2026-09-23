// sheetBackupService.js — daily tabular mirror of ERP collections into ONE
// Google Sheet ("ERP Data Backup") living inside the ERP-Automation Drive root.
//
// Tabs use the SAME Excel headers import.controller already reads (not raw
// Mongo path names), so a tab can be downloaded and re-imported without
// mapping errors. ERP schema columns are untouched — only the sheet layout.
// One tab per module; credentials reuse driveService (office refresh token or
// service account). Cron runs once a day so ERP edits show up on the next run
// (~1-day lag). Token must include the spreadsheets scope — re-run
// scripts/drive_connect.mjs after enabling the Sheets API if needed.
import {
    getAccessToken,
    driveFetch,
    ensureModuleFolders,
    isDriveConfigured
} from './driveService.js';

const FILES = 'https://www.googleapis.com/drive/v3/files';
const SHEETS = 'https://sheets.googleapis.com/v4';

const SPREADSHEET_MIME = 'application/vnd.google-apps.spreadsheet';
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export const backupSpreadsheetName = () => process.env.SHEET_BACKUP_SPREADSHEET_NAME || 'ERP Data Backup';

// Tab label: Google forbids []:*?/\ and control chars; also drop " < > |
// (not all enforced by Sheets but safe for Drive-linked names). Caps at 100.
export const sheetTitle = (name) =>
    String(name || 'Sheet').replace(/[\\/*?:[\]"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'Sheet';

// One cell → a value the Sheets API accepts (primitives pass through; dates →
// ISO — import parseDate accepts ISO via Date constructor; objects/arrays →
// compact JSON so nested subdocs stay readable).
export const cellValue = (v) => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString();
    if (typeof v === 'object') {
        try { return JSON.stringify(v); } catch { return String(v); }
    }
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return v;
};

// Excel headers import.controller expects, mapped to schema paths (or get()).
// Typos are intentional where the importer still uses them (e.g. Confernce,
// Studetns) so re-import matches pick()/row['…'] without touching ERP columns.
export const IMPORT_COLUMNS = {
    partners: [
        // Import only picks Partner Name / Country / University / Status;
        // the rest are backup-only (ignored on re-import, no errors).
        { header: 'Partner Name', get: (d) => d.university || d.school || '' },
        { header: 'Country', path: 'country' },
        { header: 'University', path: 'university' },
        { header: 'Status', path: 'activeStatus' },
        { header: 'School', path: 'school' },
        { header: 'MoU Status', path: 'mouStatus' },
        { header: 'Contact Person', path: 'contactPerson' },
        { header: 'Email', path: 'email' },
        { header: 'Phone', path: 'phoneNumber' },
        { header: 'Agreement Type', path: 'agreementType' },
        { header: 'Completed On', path: 'completedOn' },
        { header: 'Signing Date', path: 'signingDate' },
        { header: 'Submitted', path: 'submitted' },
        { header: 'Expiring Date', path: 'expiringDate' },
        { header: 'Link', path: 'link' }
    ],
    'campus-visits': [
        { header: 'Date', path: 'date' },
        { header: 'Type', path: 'type' },
        { header: "Visitor's Name & Details", path: 'visitorName' },
        { header: 'Country', path: 'country' },
        { header: 'University Name', path: 'universityName' },
        { header: 'Summary', path: 'summary' },
        { header: 'Purpose', path: 'purpose' },
        { header: 'Department', path: 'department' },
        { header: 'Campus', path: 'campus' },
        { header: 'Drive Link', path: 'driveLink' },
        { header: 'Notes', path: 'notes' }
    ],
    seminars: [
        { header: 'Date', path: 'date' },
        { header: 'Type', path: 'type' },
        { header: "Visitor's Name & Details", path: 'visitorName' },
        { header: 'Country', path: 'country' },
        { header: 'University Name', path: 'universityName' },
        { header: 'Summary', path: 'summary' },
        { header: 'Purpose', path: 'purpose' },
        { header: 'Department', path: 'department' },
        { header: 'Campus', path: 'campus' },
        { header: 'Drive Link', path: 'driveLink' },
        { header: 'Notes', path: 'notes' }
    ],
    'consultant-visits': [
        { header: 'Date', path: 'date' },
        { header: 'Type', path: 'type' },
        { header: "Visitor's Name & Details", path: 'visitorName' },
        { header: 'Country', path: 'country' },
        { header: 'University Name', path: 'universityName' },
        { header: 'Summary', path: 'summary' },
        { header: 'Purpose', path: 'purpose' },
        { header: 'Department', path: 'department' },
        { header: 'Campus', path: 'campus' },
        { header: 'Drive Link', path: 'driveLink' },
        { header: 'Notes', path: 'notes' }
    ],
    'mou-signing-ceremonies': [
        { header: 'Date', path: 'date' },
        { header: 'Type', path: 'type' },
        { header: "Visitor's Name & Details", path: 'visitorName' },
        // Import historically wrote universityName; schema requires `university`.
        { header: 'University Name', path: 'university' },
        { header: 'Department', path: 'department' },
        { header: 'Event Summary', path: 'eventSummary' },
        { header: 'Campus(Kudlu,Harohalli)', path: 'campus' },
        { header: 'drive link', path: 'driveLink' }
    ],
    events: [
        { header: 'Date', path: 'date' },
        { header: 'Type', path: 'type' },
        { header: 'Name & Details', path: 'title' },
        { header: 'Department', path: 'department' },
        { header: 'University with country', path: 'universityCountry' },
        { header: 'Dignitaries', path: 'dignitaries' },
        { header: 'Event Summary', path: 'eventSummary' },
        { header: 'Campus', path: 'campus' },
        { header: 'drive link', path: 'driveLink' }
    ],
    conferences: [
        { header: 'Date', path: 'date' },
        { header: 'Confernce Name', path: 'conferenceName' },
        { header: 'Country', path: 'country' },
        { header: 'Department', path: 'department' },
        { header: 'Event Summary', path: 'eventSummary' },
        { header: 'Campus(Kudlu,Harohalli)', path: 'campus' },
        { header: 'drive link', path: 'driveLink' }
    ],
    'scholars-in-residence': [
        { header: 'Scholar Name', path: 'scholarName' },
        { header: 'Designation', path: 'designation' },
        { header: 'University', path: 'university' },
        { header: 'Country', path: 'country' },
        { header: 'QS Ranking', path: 'qsRanking' },
        { header: 'Duration / Days', path: 'durationDays' },
        { header: 'Start Date', path: 'startDate' },
        { header: 'End Date', path: 'endDate' },
        { header: 'Schools / Department', path: 'department' },
        { header: 'Accommodation / Campus', path: 'campus' },
        { header: 'Status', path: 'scholarStatus' },
        { header: 'Email', path: 'email' },
        { header: 'Mobile', path: 'mobile' },
        { header: 'Remarks / Summary', path: 'summary' },
        { header: 'Drive Link', path: 'driveLink' },
        { header: 'Notes', path: 'notes' }
    ],
    'mou-updates': [
        { header: 'Date', path: 'date' },
        { header: 'Country', path: 'country' },
        { header: 'University', path: 'university' },
        { header: 'Department', path: 'department' },
        { header: 'Completed Date', path: 'completedDate' },
        { header: 'MoU Status', path: 'mouStatus' },
        { header: 'Contact Person', path: 'contactPerson' },
        { header: 'Contact Email', path: 'contactEmail' },
        { header: 'Agreement Type', path: 'agreementType' },
        { header: 'Term', path: 'term' },
        { header: 'Validity Status', path: 'validityStatus' },
        { header: 'Drive Link', path: 'driveLink' }
    ],
    'immersion-programs': [
        { header: 'Status', path: 'programStatus' },
        { header: 'Incoming/Outgoing', path: 'direction' },
        { header: 'University', path: 'university' },
        { header: 'Country', path: 'country' },
        { header: 'No of Pax', path: 'numberOfPax' },
        { header: 'Department', path: 'department' },
        { header: 'Arrival Date', path: 'arrivalDate' },
        { header: 'Departure Date', path: 'departureDate' },
        {
            header: 'Fees Per Pax',
            // money() strips the unit; currency() recovers it — keep "8450 AUD".
            get: (d) => {
                if (d.feesPerPax === null || d.feesPerPax === undefined || d.feesPerPax === '') return '';
                return d.feesCurrency ? `${d.feesPerPax} ${d.feesCurrency}` : String(d.feesPerPax);
            }
        },
        { header: 'Summary', path: 'summary' },
        { header: 'Drive Link', path: 'driveLink' },
        { header: 'Notes', path: 'notes' }
    ],
    'student-exchange': [
        { header: 'Direction', path: 'direction' },
        { header: 'Student Name', path: 'studentName' },
        { header: 'Exchange University', path: 'exchangeUniversity' },
        { header: 'Country', path: 'country' },
        { header: 'Course', path: 'course' },
        { header: 'Semester / Year', path: 'semesterYear' },
        { header: 'USN', path: 'usnNo' },
        { header: 'From Date', path: 'fromDate' },
        { header: 'To Date', path: 'toDate' },
        { header: 'Status', path: 'exchangeStatus' },
        { header: 'Document Link', path: 'driveLink' },
        { header: 'Notes', path: 'notes' }
    ],
    'masters-abroad': [
        // Import still keys on the historical typo "Studetns Name".
        { header: 'Studetns Name', path: 'studentName' },
        { header: 'Country', path: 'country' },
        { header: 'University', path: 'university' },
        { header: 'Course Studying', path: 'courseStudying' },
        { header: 'Course Tenure', path: 'courseTenure' },
        { header: 'Passport Number', path: 'passportNumber' },
        { header: 'USN Number', path: 'usnNumber' },
        { header: 'CGPA', path: 'cgpa' },
        { header: 'School of Study(UG at DSU)', path: 'schoolOfStudy' },
        { header: 'drive link', path: 'driveLink' }
    ],
    memberships: [
        { header: 'Date', path: 'date' },
        { header: 'Status', path: 'membershipStatus' },
        { header: 'Name', path: 'name' },
        { header: 'Summary', path: 'summary' },
        { header: 'Country', path: 'country' },
        { header: 'Membership Duration', path: 'membershipDuration' },
        { header: 'Start Date', path: 'startDate' },
        { header: 'End Date', path: 'endDate' },
        { header: 'drive link', path: 'driveLink' }
    ],
    'digital-media': [
        { header: 'Date', path: 'date' },
        { header: 'Channel', path: 'channel' },
        { header: 'Link of the Article', path: 'articleLink' },
        { header: 'Article Topic', path: 'articleTopic' },
        { header: 'Amount Paid', path: 'amountPaid' },
        { header: 'Summary', path: 'summary' },
        { header: 'drive link', path: 'driveLink' }
    ],
    'social-media': [
        { header: 'Post Name', path: 'postName' },
        { header: 'Caption', path: 'caption' },
        { header: 'Facebook', path: 'fbLink' },
        { header: 'Instagram', path: 'instaLink' },
        { header: 'LinkedIn', path: 'linkedinLink' },
        { header: 'VK', path: 'vkLink' }
    ],
    'meeting-trackers': [
        { header: 'Meeting ID', path: 'meetingId' },
        { header: 'Meeting Title', path: 'meetingTitle' },
        { header: 'Date', path: 'date' },
        { header: 'Start Time', path: 'startTime' },
        { header: 'End Time', path: 'endTime' },
        { header: 'Timezone', path: 'timezone' },
        { header: 'Mode (Online/Offline)', path: 'mode' },
        { header: 'Platform/Location', path: 'platformLocation' },
        { header: 'Host Organization', path: 'hostOrganization' },
        { header: 'Host Name', path: 'hostName' },
        { header: 'Host Email', path: 'hostEmail' },
        { header: 'Participants', path: 'participants' },
        { header: 'Key Agenda', path: 'keyAgenda' },
        { header: 'Discussion Summary', path: 'discussionSummary' },
        { header: 'Action Items', path: 'actionItems' },
        { header: 'Next Meeting Date', path: 'nextMeetingDate' },
        { header: 'Drive Link (MoM/Recording)', path: 'driveLink' },
        { header: 'Remarks', path: 'remarks' },
        { header: 'Sheet Month', path: 'sheetMonth' }
    ],
    outreach: [
        // Custom /outreach/import-csv: University + Email + Country required.
        { header: 'Name', path: 'name' },
        { header: 'University', path: 'university' },
        { header: 'Country', path: 'country' },
        { header: 'Email', path: 'email' },
        { header: 'Email 2', get: (d) => d.alternativeEmails?.[0] || '' },
        { header: 'Email 3', get: (d) => d.alternativeEmails?.[1] || '' },
        { header: 'Email 4', get: (d) => d.alternativeEmails?.[2] || '' },
        { header: 'Contact Person', path: 'contactPerson' },
        { header: 'Contact Name', path: 'contactName' },
        { header: 'Phone', path: 'phone' },
        { header: 'Website', path: 'website' },
        { header: 'Partnership Type', path: 'partnershipType' },
        { header: 'Reply', path: 'reply' },
        { header: 'Notes', path: 'notes' },
        { header: 'Department', path: 'department' },
        { header: 'Outreach Status', path: 'outreachStatus' },
        { header: 'Sent Date', path: 'sentDate' },
        { header: 'Sent From Email', path: 'sentFromEmail' }
    ],
    'outreach-new': [
        // Custom /outreach-new/import-xlsx: University + Email required.
        // Import only reads one Email cell (splits on spaces/commas) — fold
        // alternates in so they survive re-import.
        { header: 'University Name', path: 'university' },
        { header: 'Country', path: 'country' },
        {
            header: 'Email',
            get: (d) => [d.email, ...(d.alternativeEmails || [])].filter(Boolean).join(' ')
        },
        { header: 'Contact Person Name', path: 'contactName' },
        { header: 'Designation / Role', path: 'contactPerson' },
        { header: 'Department', path: 'department' },
        { header: 'Phone', path: 'phone' },
        { header: 'Website', path: 'website' },
        { header: 'Partnership Type', path: 'partnershipType' },
        { header: 'Notes', path: 'notes' },
        { header: 'Outreach Status', path: 'outreachStatus' }
    ]
};

// Schema path names safe to export (fallback when a module has no
// IMPORT_COLUMNS entry): skip Mongo internals and select:false secrets.
export const exportablePaths = (schema) => {
    const out = [];
    for (const [path, type] of Object.entries(schema.paths)) {
        if (path === '__v' || path === 'id') continue;
        if (type.options?.select === false) continue;
        out.push(path);
    }
    return out;
};

const columnCell = (col, doc) => {
    if (col.get) return cellValue(col.get(doc));
    return cellValue(doc[col.path]);
};

// Build a header row + data rows for one collection. Prefer IMPORT_COLUMNS
// for `slug` so the tab re-imports cleanly; otherwise dump schema paths.
export const buildSheetRows = (schema, docs, slug) => {
    const cols = slug ? IMPORT_COLUMNS[slug] : null;
    if (cols) {
        const header = cols.map((c) => c.header);
        const rows = docs.map((doc) => cols.map((c) => columnCell(c, doc)));
        return { header, rows };
    }
    const paths = exportablePaths(schema);
    const header = ['_id', ...paths];
    const rows = docs.map((doc) => [
        String(doc._id ?? ''),
        ...paths.map((p) => cellValue(doc[p]))
    ]);
    return { header, rows };
};

// Business modules mirrored to tabs — order = tab order in the workbook.
// `filter` applies on top of soft-delete (status:active) when the model has it.
export const BACKUP_MODULES = [
    { slug: 'partners',                 sheet: 'Partners',                model: 'Partner' },
    { slug: 'campus-visits',            sheet: 'Campus Visits',           model: 'CampusVisit' },
    { slug: 'seminars',                 sheet: 'Seminars',                model: 'Seminar' },
    { slug: 'consultant-visits',        sheet: 'Consultant Visits',       model: 'ConsultantVisit' },
    { slug: 'events',                   sheet: 'Events',                  model: 'Event' },
    { slug: 'mou-signing-ceremonies',   sheet: 'MoU Signing Ceremonies',  model: 'MouSigningCeremony' },
    { slug: 'conferences',              sheet: 'Conferences',             model: 'Conference' },
    { slug: 'scholars-in-residence',    sheet: 'Scholars in Residence',   model: 'ScholarInResidence' },
    { slug: 'mou-updates',              sheet: 'MoU Updates',             model: 'MouUpdate' },
    { slug: 'immersion-programs',       sheet: 'Immersion Programs',      model: 'ImmersionProgram' },
    { slug: 'student-exchange',         sheet: 'Student Exchange',        model: 'StudentExchange' },
    { slug: 'masters-abroad',           sheet: 'Masters Abroad',          model: 'MastersAbroad' },
    { slug: 'memberships',              sheet: 'Memberships',             model: 'Membership' },
    { slug: 'digital-media',            sheet: 'Digital Media',           model: 'DigitalMedia' },
    { slug: 'social-media',             sheet: 'Social Media',            model: 'SocialMedia' },
    { slug: 'meeting-trackers',         sheet: 'Meeting Trackers',        model: 'MeetingTracker' },
    { slug: 'outreach',                 sheet: 'Outreach (legacy)',       model: 'Outreach' },
    { slug: 'outreach-new',             sheet: 'Outreach Mail',           model: 'OutreachNew' }
];

const sheetsFetch = async (accessToken, { method = 'GET', url, json }) => {
    const upper = method.toUpperCase();
    const hasBody = upper !== 'GET' && upper !== 'HEAD' && json !== undefined;
    const r = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(json !== undefined ? { 'Content-Type': 'application/json' } : {})
        },
        ...(hasBody ? { body: JSON.stringify(json) } : {})
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const reason = j.error?.message || j.error?.status || 'unknown';
        if (r.status === 401 || (r.status === 403 && /scope|permission/i.test(String(reason)))) {
            throw new Error('Sheets authorization failed — re-run scripts/drive_connect.mjs with the Sheets API enabled (spreadsheets scope). (' + reason + ')');
        }
        throw new Error(`Sheets request failed: ${reason} (${r.status})`);
    }
    return j;
};

// Find-or-create the backup workbook under ERP-Automation. Drive creates the
// file (parents are a Drive concern); Sheets API then manages tabs/cells.
export const ensureBackupSpreadsheet = async (accessToken, rootId) => {
    const name = backupSpreadsheetName();
    const q = `'${esc(rootId)}' in parents and name='${esc(name)}' and mimeType='${SPREADSHEET_MIME}' and trashed=false`;
    const found = await driveFetch(accessToken, {
        url: FILES,
        query: `q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1&corpora=user&spaces=drive`
    });
    if (found.files?.[0]?.id) return found.files[0].id;

    const created = await driveFetch(accessToken, {
        method: 'POST',
        url: FILES,
        query: 'fields=id,name,mimeType',
        json: { name, mimeType: SPREADSHEET_MIME, parents: [rootId] }
    });
    return created.id;
};

// Ensure every BACKUP_MODULES tab exists; return a map sheetTitle → sheetId.
export const ensureSheetTabs = async (accessToken, spreadsheetId) => {
    const meta = await sheetsFetch(accessToken, {
        url: `${SHEETS}/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title,index)`
    });
    const byTitle = new Map((meta.sheets || []).map((s) => [s.properties.title, s.properties.sheetId]));

    const missing = BACKUP_MODULES
        .map((m) => sheetTitle(m.sheet))
        .filter((t) => !byTitle.has(t));

    if (missing.length) {
        // Keep the default "Sheet1" as the first tab if it is empty/unused later;
        // add missing tabs after the last existing one.
        const requests = missing.map((title) => ({ addSheet: { properties: { title } } }));
        await sheetsFetch(accessToken, {
            method: 'POST',
            url: `${SHEETS}/spreadsheets/${spreadsheetId}:batchUpdate`,
            json: { requests }
        });
        const meta2 = await sheetsFetch(accessToken, {
            url: `${SHEETS}/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title,index)`
        });
        byTitle.clear();
        for (const s of meta2.sheets || []) byTitle.set(s.properties.title, s.properties.sheetId);
    }
    return byTitle;
};

// Overwrite one tab: clear then write header + rows starting at A1.
export const writeTab = async (accessToken, spreadsheetId, title, header, rows) => {
    const range = `'${title.replace(/'/g, "''")}'`;
    await sheetsFetch(accessToken, {
        method: 'POST',
        url: `${SHEETS}/spreadsheets/${spreadsheetId}/values:batchClear`,
        json: { ranges: [range] }
    });
    const values = [header, ...rows];
    // Sheets caps a single values.update payload; chunk if huge (10k rows × cols
    // is already generous for these collections — still guard the write).
    const CHUNK = 5000;
    if (values.length <= CHUNK) {
        await sheetsFetch(accessToken, {
            method: 'PUT',
            url: `${SHEETS}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
            json: { range, majorDimension: 'ROWS', values }
        });
        return rows.length;
    }
    let written = 0;
    for (let i = 0; i < values.length; i += CHUNK) {
        const slice = values.slice(i, i + CHUNK);
        const startRow = i + 1;
        const endRow = i + slice.length;
        const chunkRange = `${range}!A${startRow}:${columnName(header.length)}${endRow}`;
        await sheetsFetch(accessToken, {
            method: 'PUT',
            url: `${SHEETS}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(chunkRange)}?valueInputOption=RAW`,
            json: { range: chunkRange, majorDimension: 'ROWS', values: slice }
        });
        written += Math.max(0, slice.length - (i === 0 ? 1 : 0));
    }
    return written;
};

// 1 → A, 27 → AA … used only for chunk ranges.
export const columnName = (n) => {
    let s = '';
    let x = n;
    while (x > 0) {
        x -= 1;
        s = String.fromCharCode(65 + (x % 26)) + s;
        x = Math.floor(x / 26);
    }
    return s || 'A';
};

const loadModuleDocs = async (mod) => {
    const { default: Model } = await import(`../models/${mod.model}.js`);
    const hasStatus = !!Model.schema.paths.status;
    const filter = hasStatus ? { status: 'active' } : {};
    // outreach-new closed threads still belong in a backup — no extra filter.
    const docs = await Model.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .lean();
    return { schema: Model.schema, docs };
};

// Full run: ensure root/module folders exist, find-or-create the workbook,
// ensure tabs, dump every module. Returns a per-module summary (for logs /
// the manual script). Throws only on credential/Drive/Sheets hard failures.
export const runSheetBackup = async () => {
    if (!isDriveConfigured()) {
        const err = new Error('Drive is not configured — cannot run Sheets backup.');
        err.code = 'DRIVE_NOT_CONFIGURED';
        throw err;
    }

    const { rootId } = await ensureModuleFolders();
    const accessToken = await getAccessToken();
    const spreadsheetId = await ensureBackupSpreadsheet(accessToken, rootId);
    const tabs = await ensureSheetTabs(accessToken, spreadsheetId);

    const results = [];
    for (const mod of BACKUP_MODULES) {
        const title = sheetTitle(mod.sheet);
        try {
            const { schema, docs } = await loadModuleDocs(mod);
            const { header, rows } = buildSheetRows(schema, docs, mod.slug);
            const n = await writeTab(accessToken, spreadsheetId, title, header, rows);
            results.push({ module: mod.slug, sheet: title, rows: n, ok: true });
        } catch (e) {
            results.push({ module: mod.slug, sheet: title, rows: 0, ok: false, error: e.message });
        }
    }

    return {
        spreadsheetId,
        spreadsheetName: backupSpreadsheetName(),
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        rootId,
        results
    };
};

export const isBackupEnabled = () => {
    const raw = (process.env.SHEET_BACKUP_ENABLED || 'true').toLowerCase();
    return raw !== 'false' && raw !== '0' && raw !== 'off';
};
