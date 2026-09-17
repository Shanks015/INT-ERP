import PDFDocument from 'pdfkit-table';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import Partner from '../models/Partner.js';
import CampusVisit from '../models/CampusVisit.js';
import Seminar from '../models/Seminar.js';
import ConsultantVisit from '../models/ConsultantVisit.js';
import Event from '../models/Event.js';
import Conference from '../models/Conference.js';
import MouSigningCeremony from '../models/MouSigningCeremony.js';
import Scholar from '../models/ScholarInResidence.js';
import MouUpdate from '../models/MouUpdate.js';
import ImmersionProgram from '../models/ImmersionProgram.js';
import StudentExchange from '../models/StudentExchange.js';
import MastersAbroad from '../models/MastersAbroad.js';
import Membership from '../models/Membership.js';
import DigitalMedia from '../models/DigitalMedia.js';
import Outreach from '../models/Outreach.js';
import MeetingTracker from '../models/MeetingTracker.js';
import SocialMedia from '../models/SocialMedia.js';
import { isExpiredValue } from '../utils/recordExpiry.js';

// dd/MMM/yyyy date formatter for scholar reports
const fmtDDMMM = (v) => {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '-';
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
};

const getModel = (moduleName) => {
    switch (moduleName) {
        case 'partners': return Partner;
        case 'campus-visits': return CampusVisit;
        case 'seminars': return Seminar;
        case 'consultant-visits': return ConsultantVisit;
        case 'events': return Event;
        case 'conferences': return Conference;
        case 'mou-signing-ceremonies': return MouSigningCeremony;
        case 'scholars-in-residence': return Scholar;
        case 'mou-updates': return MouUpdate;
        case 'immersion-programs': return ImmersionProgram;
        case 'student-exchange': return StudentExchange;
        case 'masters-abroad': return MastersAbroad;
        case 'memberships': return Membership;
        case 'digital-media': return DigitalMedia;
        case 'outreach': return Outreach;
        case 'meeting-trackers': return MeetingTracker;
        case 'social-media': return SocialMedia;
        default: return null;
    }
};

// Record Status in exported reports is derived from each dated module's real end
// date — the stored field only refreshes in pre('save') (see utils/recordExpiry.js).
// Report slug → expiry field; mirrors EXPIRY_DATE_FIELDS. Modules with no record
// Status column (masters-abroad, mou-signing-ceremonies) don't appear here.
const DERIVED_RS_FIELDS = {
    partners: 'expiringDate',
    'scholars-in-residence': 'endDate',
    'immersion-programs': 'departureDate',
    'student-exchange': 'toDate',
    memberships: 'endDate'
};

const derivedRecordStatus = (moduleName, item) => {
    const field = DERIVED_RS_FIELDS[moduleName];
    if (field) return isExpiredValue(item?.[field]) ? 'expired' : 'active';
    return item?.recordStatus || 'active';
};

const getDisplayFields = (moduleName) => {
    // Define columns for each module - returns { headers: [], extractor: (item) => [] }
    switch (moduleName) {
        case 'partners':
            return {
                headers: ['University', 'Country', 'School', 'MoU Status', 'Contact Person', 'Email', 'Phone', 'Agreement Type', 'Completed On', 'Department', 'Record Status'],
                extractor: (item) => [
                    item.university || '-',
                    item.country || '-',
                    item.school || '-',
                    item.mouStatus || '-',
                    item.contactPerson || '-',
                    item.email || '-',
                    item.phoneNumber || '-',
                    item.agreementType || '-',
                    fmtDDMMM(item.completedOn),
                    item.department || '-',
                    derivedRecordStatus('partners', item)
                ]
            };
        case 'campus-visits':
            return {
                headers: ['Date', 'University', 'Country', 'Visitor Name', 'Type', 'Department', 'Campus'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.universityName || '-',
                    item.country || '-',
                    item.visitorName || '-',
                    item.type || '-',
                    item.department || '-',
                    item.campus || '-'
                ]
            };
        case 'seminars':
            return {
                headers: ['Date', 'University', 'Country', 'Visitor Name', 'Type', 'Department', 'Campus'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.universityName || '-',
                    item.country || '-',
                    item.visitorName || '-',
                    item.type || '-',
                    item.department || '-',
                    item.campus || '-'
                ]
            };
        case 'consultant-visits':
            return {
                headers: ['Date', 'University', 'Country', 'Visitor Name', 'Type', 'Department', 'Campus'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.universityName || '-',
                    item.country || '-',
                    item.visitorName || '-',
                    item.type || '-',
                    item.department || '-',
                    item.campus || '-'
                ]
            };
        case 'events':
            return {
                headers: ['Date', 'Title', 'Type', 'Dignitaries', 'Department', 'Campus', 'University Country'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.title || '-',
                    item.type || '-',
                    item.dignitaries || '-',
                    item.department || '-',
                    item.campus || '-',
                    item.universityCountry || '-'
                ]
            };
        case 'conferences':
            return {
                headers: ['Date', 'Conference Name', 'Country', 'Department', 'Campus'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.conferenceName || '-',
                    item.country || '-',
                    item.department || '-',
                    item.campus || '-'
                ]
            };
        case 'mou-signing-ceremonies':
            return {
                headers: ['Date', 'Type', 'Visitor Name', 'University', 'Department', 'Event Summary', 'Campus', 'Drive Link'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.type || '-',
                    item.visitorName || '-',
                    item.university || '-',
                    item.department || '-',
                    item.eventSummary || '-',
                    item.campus || '-',
                    item.driveLink || '-'
                ]
            };
        case 'scholars-in-residence':
            return {
                headers: ['Scholar Name', 'Designation', 'University', 'Country', 'QS Ranking', 'Duration / Days', 'Start Date', 'End Date', 'Schools / Department', 'Accommodation / Campus', 'Status', 'Email', 'Mobile', 'Remarks / Summary', 'Drive Link', 'Notes', 'Record Status'],
                extractor: (item) => [
                    item.scholarName || '-',
                    item.designation || '-',
                    item.university || '-',
                    item.country || '-',
                    item.qsRanking || '-',
                    item.durationDays || '-',
                    fmtDDMMM(item.startDate),
                    fmtDDMMM(item.endDate),
                    item.department || '-',
                    item.campus || '-',
                    item.scholarStatus || '-',
                    item.email || '-',
                    item.mobile || '-',
                    item.summary || '-',
                    item.driveLink || '-',
                    item.notes || '-',
                    derivedRecordStatus('scholars-in-residence', item)
                ]
            };
        case 'mou-updates':
            return {
                headers: ['Date', 'Country', 'University', 'Department', 'Contact Person', 'MoU Status', 'Contact Email', 'Agreement Type', 'Term', 'Validity Status', 'Drive Link'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.country || '-',
                    item.university || '-',
                    item.department || '-',
                    item.contactPerson || '-',
                    item.mouStatus || '-',
                    item.contactEmail || '-',
                    item.agreementType || '-',
                    item.term || '-',
                    item.validityStatus || '-',
                    item.driveLink || '-'
                ]
            };
        case 'immersion-programs':
            return {
                headers: ['Status', 'Direction', 'University', 'Country', 'Number of Pax', 'Department', 'Arrival Date', 'Departure Date', 'Fees Per Pax', 'Drive Link', 'Notes', 'Record Status'],
                extractor: (item) => [
                    item.programStatus || '-',
                    item.direction || '-',
                    item.university || '-',
                    item.country || '-',
                    item.numberOfPax ?? '-',
                    item.department || '-',
                    fmtDDMMM(item.arrivalDate),
                    fmtDDMMM(item.departureDate),
                    item.feesPerPax != null && item.feesCurrency ? `${item.feesPerPax} ${item.feesCurrency}` : (item.feesPerPax ?? '-'),
                    item.driveLink || '-',
                    item.notes || '-',
                    derivedRecordStatus('immersion-programs', item)
                ]
            };
        case 'student-exchange':
            return {
                headers: ['Direction', 'Student Name', 'Exchange University', 'Country', 'Course', 'Semester / Year', 'USN', 'Status', 'From Date', 'To Date', 'Drive Link', 'Notes', 'Record Status'],
                extractor: (item) => [
                    item.direction || '-',
                    item.studentName || '-',
                    item.exchangeUniversity || '-',
                    item.country || '-',
                    item.course || '-',
                    item.semesterYear || '-',
                    item.usnNo || '-',
                    item.exchangeStatus || '-',
                    fmtDDMMM(item.fromDate),
                    fmtDDMMM(item.toDate),
                    item.driveLink || '-',
                    item.notes || '-',
                    derivedRecordStatus('student-exchange', item)
                ]
            };
        case 'masters-abroad':
            return {
                headers: ['Student Name', 'University', 'Country', 'Course', 'Tenure', 'USN', 'CGPA', 'School'],
                extractor: (item) => [
                    item.studentName || '-',
                    item.university || '-',
                    item.country || '-',
                    item.courseStudying || '-',
                    item.courseTenure || '-',
                    item.usnNumber || '-',
                    item.cgpa || '-',
                    item.schoolOfStudy || '-'
                ]
            };
        case 'memberships':
            return {
                headers: ['Name', 'Country', 'Membership Status', 'Start Date', 'End Date', 'Record Status'],
                extractor: (item) => [
                    item.name || '-',
                    item.country || '-',
                    item.membershipStatus || '-',
                    fmtDDMMM(item.startDate),
                    fmtDDMMM(item.endDate),
                    derivedRecordStatus('memberships', item)
                ]
            };
        case 'digital-media':
            return {
                headers: ['Date', 'Article Topic', 'Channel', 'Amount Paid'],
                extractor: (item) => [
                    fmtDDMMM(item.date),
                    item.articleTopic || '-',
                    item.channel || '-',
                    item.amountPaid || 'Zero'
                ]
            };
        case 'outreach':
            return {
                headers: ['Program Name', 'Country', 'Partnership Type', 'Department'],
                extractor: (item) => [
                    item.programName || item.name || '-',
                    item.country || '-',
                    item.partnershipType || '-',
                    item.department || '-'
                ]
            };
        case 'meeting-trackers':
            return {
                headers: ['Meeting ID', 'Date', 'Meeting Title', 'Mode', 'Country', 'Key Agenda', 'Discussion Summary', 'Action Items', 'Drive Link'],
                extractor: (item) => [
                    item.meetingId || '-',
                    fmtDDMMM(item.date),
                    item.meetingTitle || '-',
                    item.mode || '-',
                    item.hostOrganization || item.country || '-',
                    item.keyAgenda || '-',
                    item.discussionSummary || '-',
                    item.actionItems || '-',
                    item.driveLink || '-'
                ]
            };
        case 'social-media':
            return {
                headers: ['Post Name', 'Caption', 'Facebook', 'Instagram', 'LinkedIn', 'VK', 'Created'],
                extractor: (item) => [
                    item.postName || '-',
                    item.caption || '-',
                    item.fbLink || '-',
                    item.instaLink || '-',
                    item.linkedinLink || '-',
                    item.vkLink || '-',
                    fmtDDMMM(item.createdAt)
                ]
            };
        default:
            return {
                headers: ['Module', 'Date', 'Name', 'Details'],
                extractor: (item) => [
                    item.module || '-',
                    fmtDDMMM(item.createdAt),
                    item.name || item.title || '-',
                    item.country || item.department || '-'
                ]
            };
    }
};

// Per-module date-window semantics for Reports (S1/S2 + #66). Each module maps
// to ONE of:
//   { single: 'field' }                 — records dated within [start, end]
//   { pair: ['startField', 'endField']} — record's range OVERLAPS [start, end]
//   { createdAt: true }                 — no domain date field → createdAt
// The old code guessed 'date'/'fromDate', which produced 0 rows for partners
// (no 'date') and scholars-in-residence (no 'fromDate') on any date window.
const DATE_WINDOW = {
    'partners': { single: 'signingDate' },
    'campus-visits': { single: 'date' },
    'seminars': { single: 'date' },
    'consultant-visits': { single: 'date' },
    'events': { single: 'date' },
    'conferences': { single: 'date' },
    'mou-signing-ceremonies': { single: 'date' },
    'mou-updates': { single: 'date' },
    'digital-media': { single: 'date' },
    'meeting-trackers': { single: 'date' },
    'memberships': { pair: ['startDate', 'endDate'] },
    'scholars-in-residence': { pair: ['startDate', 'endDate'] },
    'student-exchange': { pair: ['fromDate', 'toDate'] },
    'immersion-programs': { pair: ['arrivalDate', 'departureDate'] },
    'masters-abroad': { createdAt: true },
    'social-media': { createdAt: true },
    'outreach': { createdAt: true }
};

// An endDate bound means "through the end of that day", matching every list filter.
const endOfDay = (d) => { const end = new Date(d); end.setHours(23, 59, 59, 999); return end; };

// PDF table layout. Cell text is the reason a row can outgrow the page: a 1,877
// character Discussion Summary in a narrow column produced a row taller than an
// A4 landscape page, which pdfkit-table then rendered as a near-empty page per
// line (the "one line, then skip the page" report bug). So: collapse each cell
// to a single line, cap its length, and size columns by their content instead of
// an equal split.
const TABLE_WIDTH = 800;
const MAX_CELL_CHARS = 180;
const CELL_PADDING = 2; // pdfkit-table options.padding, applied on each side
const MAX_WORD_WIDTH = 60; // widest a single unbreakable token may claim in a column
const MAX_COL_WIDTH = 200; // soft ceiling so one long cell cannot hog the page
const ROW_ADVANCE = 6.5; // pdfkit-table columnSpacing (3) + columnSpacing + rowDistance (0.5)
const PAGE_RESERVE = 40; // absorbs pdfkit-table's own per-table title/gap overhead

export const clampCell = (v) => {
    const s = String(v ?? '-').replace(/\s+/g, ' ').trim();
    if (!s) return '-';
    return s.length > MAX_CELL_CHARS ? `${s.slice(0, MAX_CELL_CHARS - 1)}…` : s;
};

// Column widths sized on the real rendered text: every column first gets room
// for its widest single word (so dates, statuses and IDs never break mid-token),
// then the space left over is shared in proportion to how much more each column
// wants. Character counts would not do — "04/Apr/2026" is 11 characters but
// nearly three times the width of a same-length run of narrow glyphs.
export const columnWidths = (doc, headers, rows, total = TABLE_WIDTH) => {
    const pad = CELL_PADDING * 2;
    // Headers render bold and data rows in the row font, so each is measured in
    // the face it actually draws with — Helvetica misses bold by a few percent,
    // which is enough to wrap a header onto a second line for no reason.
    const measure = (font, texts) => {
        doc.font(font);
        return {
            widest: Math.max(0, ...texts.map((s) => doc.widthOfString(s))),
            word: Math.max(0, ...texts.flatMap((s) => s.split(' ').map((w) => doc.widthOfString(w))))
        };
    };
    const cols = headers.map((h, i) => {
        const head = measure('Helvetica-Bold', [String(h)]);
        const body = measure('Helvetica', rows.map((r) => String(r[i] ?? '-')));
        return { widest: Math.max(head.widest, body.widest), word: Math.max(head.word, body.word) };
    });
    // A column that is one giant token (a URL) still wraps; it just gets the
    // capped word width rather than demanding its whole length on one line.
    const min = cols.map((c) => Math.min(c.word, MAX_WORD_WIDTH) + pad);
    const want = cols.map((c, i) => Math.max(min[i], Math.min(c.widest + pad, MAX_COL_WIDTH)));
    const minSum = min.reduce((a, b) => a + b, 0);
    if (minSum > total) return min.map((m) => (m / minSum) * total);
    // Share the leftover in proportion to what each column still wants; if no
    // column wants more (a table of short values), widen them in proportion to
    // their minimums instead, so the table still spans the page.
    const wants = want.map((w, i) => w - min[i]);
    const share = wants.some((w) => w > 0) ? wants : min;
    const shareSum = share.reduce((a, b) => a + b, 0) || 1;
    return min.map((m, i) => m + ((total - minSum) * share[i]) / shareSum);
};

const tableRows = (fieldConfig, data) =>
    data.map((item) => fieldConfig.extractor(item).map(clampCell));

// pdfkit-table breaks pages using its own `this.y` cursor, which after a row is
// only the LAST cell's bottom rather than the row's — so a row that does not fit
// slips past the bottom margin, pdfkit then breaks the page once per overflowing
// cell, and the library's row cursor is left pointing at the old page. That is
// what produced the run of near-empty pages. Rather than patch the library, pack
// the rows into page-sized batches here and hand it one batch per page, so its
// break path never runs.
//
// Space a row consumes: the library's own height for it, plus the gap it leaves
// before the next. Measured in the font the rows render in, so it matches what
// the library computes.
export const rowHeight = (doc, row, widths) => ROW_ADVANCE + Math.max(...row.map((cell, i) =>
    doc.heightOfString(String(cell), { width: widths[i] - CELL_PADDING * 2 })));

// Splits rows into one batch per page, none taller than the page's budget
// (already net of the header row). `firstBudget` is what the page the table
// starts on still has free; every later page gets `budget`.
export const planPages = (doc, headers, rows, widths, firstBudget, budget) => {
    const pages = [];
    let page = [];
    let used = 0;
    let free = firstBudget;
    for (const row of rows) {
        const h = rowHeight(doc, row, widths);
        if (page.length && used + h > free) { pages.push(page); page = []; used = 0; free = budget; }
        page.push(row);
        used += h;
    }
    if (page.length) pages.push(page);
    return pages;
};

// Renders a table across as many pages as it needs, header repeated on each.
const renderTable = async (doc, headers, rows, tableConfig) => {
    doc.font('Helvetica').fontSize(7);
    const widths = columnWidths(doc, headers, rows);
    const headerHeight = rowHeight(doc, headers, widths);

    // Room for data rows on a clean page, and what the current one still has.
    const budget = doc.page.height - doc.page.margins.top - doc.page.margins.bottom
        - PAGE_RESERVE - headerHeight;
    let firstBudget = budget - (doc.y - doc.page.margins.top);
    if (firstBudget < rowHeight(doc, rows[0] || headers, widths)) {
        doc.addPage(); // never start a table in the sliver left at a page bottom
        firstBudget = budget;
    }

    let first = true;
    const pages = planPages(doc, headers, rows, widths, firstBudget, budget);
    // A filter that matches nothing still shows the header, not a blank page.
    for (const page of pages.length ? pages : [[]]) {
        if (!first) doc.addPage();
        first = false;
        await doc.table({ headers, rows: page }, { ...tableConfig, columnsSize: widths });
    }
};

const fetchData = async (module, filters) => {
    const query = {};

    // Date window — applied when EITHER bound is given (previously required both
    // and built a $gte+$lte against one hard-coded field).
    if (filters.startDate || filters.endDate) {
        const win = DATE_WINDOW[module];
        if (win?.createdAt) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate) query.createdAt.$lte = endOfDay(filters.endDate);
        } else if (win?.pair) {
            const [startF, endF] = win.pair;
            if (filters.startDate) query[endF] = { $gte: new Date(filters.startDate) };
            if (filters.endDate) {
                query[startF] = { ...(query[startF] || {}), $lte: endOfDay(filters.endDate) };
            }
        } else if (win?.single) {
            query[win.single] = {};
            if (filters.startDate) query[win.single].$gte = new Date(filters.startDate);
            if (filters.endDate) query[win.single].$lte = endOfDay(filters.endDate);
        }
    }

    // Status filtering - only filter if a specific status is selected
    if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
    }

    // Module-specific filters
    if (filters.country && filters.country.trim()) {
        query.country = { $regex: filters.country, $options: 'i' }; // Case-insensitive search
    }
    if (filters.department && filters.department.trim()) {
        query.department = { $regex: filters.department, $options: 'i' };
    }
    if (filters.type && filters.type.trim()) {
        query.type = filters.type;
    }
    if (filters.category && filters.category.trim()) {
        query.category = filters.category;
    }
    if (filters.direction && filters.direction.trim()) {
        query.direction = filters.direction;
    }
    if (filters.campus && filters.campus.trim()) {
        query.campus = filters.campus;
    }
    if (filters.channel && filters.channel.trim()) {
        query.channel = filters.channel;
    }
    if (filters.agreementType && filters.agreementType.trim()) {
        query.agreementType = filters.agreementType;
    }
    if (filters.membershipStatus && filters.membershipStatus.trim()) {
        query.membershipStatus = filters.membershipStatus;
    }
    if (filters.partnershipType && filters.partnershipType.trim()) {
        query.partnershipType = filters.partnershipType;
    }

    const Model = getModel(module);
    if (!Model) return [];

    const data = await Model.find(query).lean();
    return data.map(item => ({ ...item, module }));
};

export const generateReport = async (req, res) => {
    try {
        const filters = req.body; // Get all filters from request body
        const { format, modules } = filters;

        const modulesToFetch = modules === 'all'
            ? ['partners', 'campus-visits', 'seminars', 'consultant-visits', 'events', 'conferences', 'mou-signing-ceremonies', 'scholars-in-residence', 'mou-updates', 'immersion-programs', 'student-exchange', 'masters-abroad', 'memberships', 'digital-media', 'social-media', 'outreach', 'meeting-trackers']
            : [modules]; // Single module as array

        let allData = [];
        for (const mod of modulesToFetch) {
            const data = await fetchData(mod, filters);
            allData = [...allData, ...data];
        }

        if (format === 'pdf') {
            const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.pdf`);
            doc.pipe(res);

            // Header
            doc.fontSize(16).text('International Affairs Report', { align: 'center' });
            doc.fontSize(10).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
            doc.fontSize(9).text(`Module: ${modules === 'all' ? 'All Modules' : modules}`, { align: 'center' });
            doc.moveDown(0.5);

            // Table configuration to prevent empty spaces
            const tableConfig = {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(7),
                prepareRow: () => doc.font("Helvetica").fontSize(7),
                width: TABLE_WIDTH,
                padding: 2, // Minimal padding
                minHeight: 15, // Small row height
                hideLines: false
            };

            if (modules === 'all') {
                const moduleGroups = {};
                allData.forEach(item => {
                    if (!moduleGroups[item.module]) moduleGroups[item.module] = [];
                    moduleGroups[item.module].push(item);
                });

                for (const [moduleName, moduleData] of Object.entries(moduleGroups)) {
                    // Keep the heading with its header row. A4 landscape is 595pt
                    // tall, so the old `doc.y > 700` guard could never fire.
                    if (doc.y > doc.page.height - doc.page.margins.bottom - 70) doc.addPage();

                    doc.fontSize(12).text(`${moduleName.toUpperCase()}`, { underline: true });
                    doc.moveDown(0.3);

                    const fieldConfig = getDisplayFields(moduleName);
                    await renderTable(doc, fieldConfig.headers,
                        tableRows(fieldConfig, moduleData), tableConfig);

                    doc.moveDown(0.3);
                }
            } else {
                const fieldConfig = getDisplayFields(modules);
                await renderTable(doc, fieldConfig.headers,
                    tableRows(fieldConfig, allData), tableConfig);
            }

            doc.end();

        } else if (format === 'docx') {
            let allTableRows = [];

            if (modules === 'all') {
                // For "all modules", create sections for each module
                const moduleGroups = {};
                allData.forEach(item => {
                    if (!moduleGroups[item.module]) moduleGroups[item.module] = [];
                    moduleGroups[item.module].push(item);
                });

                const sections = [];
                for (const [moduleName, moduleData] of Object.entries(moduleGroups)) {
                    const fieldConfig = getDisplayFields(moduleName);

                    // Add module heading
                    sections.push(new Paragraph({
                        text: moduleName.toUpperCase(),
                        heading: HeadingLevel.HEADING_2
                    }));
                    sections.push(new Paragraph({ text: "" })); // Spacer

                    // Create header row
                    const headerRow = new TableRow({
                        children: fieldConfig.headers.map(header =>
                            new TableCell({ children: [new Paragraph({ text: header, bold: true })] })
                        )
                    });

                    // Create data rows
                    const dataRows = moduleData.map(item =>
                        new TableRow({
                            children: fieldConfig.extractor(item).map(value =>
                                new TableCell({ children: [new Paragraph(String(value))] })
                            )
                        })
                    );

                    // Add table
                    sections.push(new Table({
                        rows: [headerRow, ...dataRows],
                        width: { size: 100, type: WidthType.PERCENTAGE }
                    }));
                    sections.push(new Paragraph({ text: "" })); // Spacer
                }

                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: [
                            new Paragraph({ text: "International Affairs Report", heading: HeadingLevel.HEADING_1 }),
                            new Paragraph({ text: `Generated on: ${new Date().toLocaleDateString()}` }),
                            new Paragraph({ text: "Module: All Modules" }),
                            new Paragraph({ text: "" }), // Spacer
                            ...sections
                        ],
                    }],
                });

                const buffer = await Packer.toBuffer(doc);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.docx`);
                res.send(buffer);

            } else {
                // For single module, use module-specific columns
                const fieldConfig = getDisplayFields(modules);

                // Create header row
                const headerRow = new TableRow({
                    children: fieldConfig.headers.map(header =>
                        new TableCell({ children: [new Paragraph({ text: header, bold: true })] })
                    )
                });

                // Create data rows
                const tableRows = allData.map(item =>
                    new TableRow({
                        children: fieldConfig.extractor(item).map(value =>
                            new TableCell({ children: [new Paragraph(String(value))] })
                        )
                    })
                );

                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: [
                            new Paragraph({ text: "International Affairs Report", heading: HeadingLevel.HEADING_1 }),
                            new Paragraph({ text: `Generated on: ${new Date().toLocaleDateString()}` }),
                            new Paragraph({ text: `Module: ${modules}` }),
                            new Paragraph({ text: "" }), // Spacer
                            new Table({
                                rows: [headerRow, ...tableRows],
                                width: { size: 100, type: WidthType.PERCENTAGE }
                            }),
                        ],
                    }],
                });

                const buffer = await Packer.toBuffer(doc);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.docx`);
                res.send(buffer);
            }
        } else {
            res.status(400).json({ message: 'Invalid format' });
        }

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ message: 'Error generating report' });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const [
            partnersCount,
            eventsRes,
            scholarsRes,
            conferencesRes,
            visitsRes
        ] = await Promise.all([
            Partner.countDocuments(),
            Event.aggregate([
                { $group: { _id: "$type", count: { $sum: 1 } } }
            ]),
            Scholar.aggregate([
                { $group: { _id: "$country", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),
            Conference.countDocuments(),
            CampusVisit.aggregate([
                { $group: { _id: { $month: "$date" }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Process aggregations
        const eventTypes = eventsRes.map(e => ({ name: e._id || 'Unspecified', value: e.count }));
        const scholarCountries = scholarsRes.map(s => ({ name: s._id || 'Unknown', value: s.count }));

        // Month map
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const visitsByMonth = visitsRes.map(v => ({
            name: months[v._id - 1],
            visits: v.count
        }));

        res.json({
            success: true,
            stats: {
                counts: {
                    partners: partnersCount,
                    conferences: conferencesRes,
                    events: eventsRes.reduce((acc, curr) => acc + curr.count, 0),
                    scholars: scholarsRes.reduce((acc, curr) => acc + curr.count, 0)
                },
                charts: {
                    eventTypes,
                    scholarCountries,
                    visitsByMonth
                }
            }
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
    }
};
