// buildScholars.mjs — merge the "Scholars in Residence" sheet of Proper .xlsx
// with "List of Scholars in Residence Hub.xlsx" into a single data-first
// workbook: proper-scholarsinresidence.xlsx. No ERP-schema forcing.
//
// The Hub workbook (5 sheets: Completed / Upcoming Updated / In Progress /
// Copy of Upcoming Updated / Upcoming - Important) is the master tracker and
// contains every scholar Proper has. Reconciliation rules (all recorded):
//   * Scholar-VISITS are the unit: same person at the same university in two
//     sheets is one visit; same person at different dates is a separate visit.
//   * Field priority: Hub sheets first (Completed, then Upcoming Updated, then
//     Copy, then In Progress) — earlier wins, blanks filled, conflicts flagged.
//   * Proper enriches (Category, Campus, Drive Link, Summary) and is cross-
//     checked against Hub dates (Hub wins; Proper disagreement is flagged).
//   * "Upcoming - Important" adds no records (all duplicate) — it only tags
//     matching records as important.
import XLSX from 'xlsx';

const HUB = 'C:/Users/saish/Downloads/List of Scholars in Residence Hub (1).xlsx';
const PROPER = 'C:/Users/saish/Downloads/Proper .xlsx';
const OUT = 'C:/Users/saish/Downloads/proper-scholarsinresidence.xlsx';

const str = (v) => String(v ?? '').trim();
const clean = (s) => str(s).replace(/\s+/g, ' ');
const empty = (r) => !r || r.every(c => c == null || c === '');

// --- dates ----------------------------------------------------------------
const MONTHS = {};
['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
 'September', 'October', 'November', 'December'].forEach((n, i) => {
    MONTHS[n.toLowerCase()] = i + 1;
    MONTHS[n.toLowerCase().slice(0, 3)] = i + 1;
});
MONTHS['sept'] = 9;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
        const q = XLSX.SSF.parse_date_code(v);
        if (!q || q.y < 2000) return null;        // reject garbage (e.g. 1900 from a Days column)
        return { y: q.y, m: q.m, d: q.d };
    }
    const s = clean(v);
    if (!s || /confirm|to be|tbd|pending/i.test(s)) return null;
    // ordinal text: "30th Aug 2026"
    let m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
        const mo = MONTHS[m[2].toLowerCase()];
        if (!mo) return null;
        return { y: +m[3], m: mo, d: +m[1] };
    }
    m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (!m) return null;
    let [, A, B, Y] = m;
    let y = +Y;
    if (Y.length === 2) y = 2000 + y;
    if (y < 2000 || y > 2040) return null;
    let d, mo;
    if (s.includes('-')) { d = +A; mo = +B; }
    else if (+A > 12) { d = +A; mo = +B; }
    else if (+B > 12) { d = +B; mo = +A; }
    else { d = +A; mo = +B; }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y, m: mo, d };
}
const serialOf = (p) => p ? Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(1899, 11, 30)) / 86400000) : null;
const fmt = (p) => p ? `${String(p.d).padStart(2, '0')}-${MONTH_ABBR[p.m - 1]}-${p.y}` : '';

// --- identity -------------------------------------------------------------
const normName = (s) => clean(s)
    .toLowerCase()
    .replace(/^(mr|ms|mrs|dr|prof|sir)\.?\s+/g, '')
    .replace(/\b(professor|associate professor|assoc\.? prof\.?|ph\.?d\.?|dr\.?)\b/g, ' ')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const normUni = (s) => clean(s).toLowerCase().replace(/^the\s+/, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();

function sameVisit(a, b) {
    // same person+uni; consider it the same visit when the recorded windows
    // overlap by month, or when either side has no usable dates.
    if (a.start && b.start && a.start.y === b.start.y && a.start.m === b.start.m) return true;
    if (a.end && b.end && a.end.y === b.end.y && a.end.m === b.end.m) return true;
    return (!a.start && !b.start && !a.end && !b.end);
}

// --- status ---------------------------------------------------------------
const normStatus = (raw, sheet) => {
    const t = clean(raw).toLowerCase();
    if (sheet === 'Completed' && !/cancel|not coming/.test(t)) return 'Completed';
    if (/not coming|not interested|not able|not possible|not available|he is not|she is not|they are not/.test(t)) return 'Not Coming';
    if (/cancel/.test(t)) return 'Canceled';
    if (sheet === 'Upcoming Updated' || sheet === 'Copy of Upcoming Updated' || sheet === 'Upcoming - Important ') return 'Upcoming';
    if (sheet === 'In Progress') return 'In Progress';
    return 'Completed';
};

// --- column maps per Hub sheet ---------------------------------------------
// Sl.No|Year|Name|University|QS|Country|Days|Start|End|Schools|Status|Email
const MAP_COMPLETED = { name: 2, uni: 3, qs: 4, country: 5, days: 6, start: 7, end: 8, schools: 9, status: 10, email: 11 };
// Sl.No|Year|Name|University|Country|QS|Days|Start|End|Accom|Schools|Status|Email|Mobile
const MAP_UPCOMING = { name: 2, uni: 3, country: 4, qs: 5, days: 6, start: 7, end: 8, accom: 9, schools: 10, status: 11, email: 12, mobile: 13 };
// Sl.No|Year|Name|University|Country|QS|Days|Start|End|Accom|Schools|Remarks|Email
const MAP_PROGRESS = { name: 2, uni: 3, country: 4, qs: 5, days: 6, start: 7, end: 8, accom: 9, schools: 10, remarks: 11, email: 12 };
// Sl.No|Year|Name|University|Country|QS|Days|Accom|[][][]|Schools  (no date cols)
const MAP_IMPORTANT = { name: 2, uni: 3, country: 4, qs: 5, days: 6, accom: 7, schools: 10 };

const SHEET_ORDER = ['Completed', 'Upcoming Updated', 'Copy of Upcoming Updated', 'In Progress'];
const MAPS = {
    'Completed': MAP_COMPLETED,
    'Upcoming Updated': MAP_UPCOMING,
    'Copy of Upcoming Updated': MAP_UPCOMING,
    'In Progress': MAP_PROGRESS
};

// --- build master from Hub ---------------------------------------------------
const hb = XLSX.readFile(HUB);
const recs = [];                       // final scholar-visit records
const findVisit = (nameKey, uniKey, start, end) => {
    for (const r of recs) {
        if (r.nameKey !== nameKey || r.uniKey !== uniKey) continue;
        if (sameVisit({ start: r.start, end: r.end }, { start, end })) return r;
    }
    return null;
};

const SHEET_COL_BIAS = { 'Completed': 0, 'Upcoming Updated': 1, 'Copy of Upcoming Updated': 2, 'In Progress': 3 };
const addSource = (rec, sheet, raw) => {
    rec.lists.push(sheet);
    const bias = SHEET_COL_BIAS[sheet];
    const setF = (field, v) => { if (v && (!rec[field] || bias < (rec._src[field] ?? 99))) { rec[field] = v; rec._src[field] = bias; } };
    const setD = (field, p, raw) => {
        if (!p) return;
        if (rec[field] == null || bias < rec._src[field]) { rec[field] = p; rec._src[field] = bias; }
        else if (fmt(rec[field]) !== fmt(p)) rec.flags.add(`${sheet}: ${field} ${fmt(p)} conflicts with ${fmt(rec[field])}`);
    };
    setF('name', clean(raw.name));
    setF('uni', clean(raw.uni));
    setF('country', clean(raw.country));
    setF('qs', clean(raw.qs));
    setF('days', clean(raw.days));
    setF('schools', clean(raw.schools));
    setF('accom', clean(raw.accom));
    setF('email', clean(raw.email));
    setF('mobile', clean(raw.mobile));
    setF('statusRaw', clean(raw.status || raw.remarks));
    setD('start', raw.startP, raw.startRaw);
    setD('end', raw.endP, raw.endRaw);
    let note = clean(raw.remarks) || clean(raw.status);
    if (note && /^completed$/i.test(note)) note = '';   // status word only — redundant with Status column
    if (note) rec.remarks = [rec.remarks, note].filter(Boolean).join(' | ');
};

for (const sheet of SHEET_ORDER) {
    const rows = XLSX.utils.sheet_to_json(hb.Sheets[sheet], { header: 1, defval: null });
    let h = -1;
    for (let i = 0; i < rows.length && i < 6; i++) if (String(rows[i][0] || '').toLowerCase().includes('sl')) { h = i; break; }
    const M = MAPS[sheet];
    for (let i = h + 1; i < rows.length; i++) {
        const r = rows[i];
        if (empty(r)) continue;
        const name = clean(r[M.name]);
        const uni = clean(r[M.uni]);
        if (!name) continue;
        const startP = parseDate(r[M.start]), endP = parseDate(r[M.end]);
        // schools col sometimes holds accommodation for the newer Completed rows
        let schools = clean(r[M.schools]), accom = clean(r[M.accom]);
        if (!accom && /^campus|^hotel/i.test(schools)) { accom = schools; schools = ''; }
        const raw = {
            name, uni, country: r[M.country], qs: r[M.qs], days: r[M.days],
            schools, accom, email: r[M.email], mobile: r[M.mobile],
            status: r[M.status], remarks: r[M.remarks],
            startP, endP, startRaw: r[M.start], endRaw: r[M.end]
        };
        const nk = normName(name), uk = normUni(uni);
        let rec = findVisit(nk, uk, startP, endP);
        if (!rec) {
            rec = {
                name, nameKey: nk, uni, uniKey: uk,
                category: '', country: '', qs: '', days: '', start: null, end: null,
                schools: '', accom: '', statusRaw: '', email: '', mobile: '',
                remarks: '', summary: '', campus: '', link: '',
                lists: [], flags: new Set(), _src: {}
            };
            recs.push(rec);
        }
        addSource(rec, sheet, raw);
    }
}

// --- tag "Upcoming - Important" matches (no new records) ----------------------
{
    const rows = XLSX.utils.sheet_to_json(hb.Sheets['Upcoming - Important '], { header: 1, defval: null });
    const nk = (i) => normName(str(rows[i] && rows[i][2])) + '||' + normUni(str(rows[i] && rows[i][3]));
    const seen = new Set();
    for (let i = 3; i < Math.min(rows.length, 11); i++) {              // block 1: upcoming people
        const key = nk(i);
        if (key.includes('||')) { seen.add(key); recs.forEach(r => { if (r.nameKey + '||' + r.uniKey === key && !r.lists.includes('Upcoming - Important')) r.lists.push('Upcoming - Important'); }); }
    }
    for (let i = 13; i < rows.length; i++) {                           // block 2: completed people
        const name = str(rows[i] && rows[i][1]);
        const uni = str(rows[i] && rows[i][2]);
        if (!name || !uni) continue;
        const key = normName(name) + '||' + normUni(uni);
        if (seen.has(key)) continue;
        recs.forEach(r => { if (r.nameKey + '||' + r.uniKey === key && !r.lists.includes('Upcoming - Important')) r.lists.push('Upcoming - Important'); });
    }
}

// --- enrich from Proper ---------------------------------------------------------
{
    const rows = XLSX.utils.sheet_to_json(XLSX.readFile(PROPER).Sheets['Scholars in Residence'], { header: 1, defval: null });
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (empty(r)) continue;
        const nk = normName(r[2]), uk = normUni(r[3]);
        const startP = parseDate(r[5]), endP = parseDate(r[6]);
        const candidates = recs.filter(x => x.nameKey === nk && x.uniKey === uk);
        if (!candidates.length) continue;               // no Hub match — nothing to enrich
        let rec = null;
        if (startP) rec = candidates.find(x => x.start && x.start.y === startP.y && x.start.m === startP.m) || null;
        if (!rec && endP) rec = candidates.find(x => x.end && x.end.y === endP.y && x.end.m === endP.m) || null;
        if (!rec && candidates.length === 1) rec = candidates[0];
        if (!rec) {
            rec = candidates[0];
            rec.flags.add('Proper record could not be pinned to a specific Hub visit — attached to first');
        }
        if (!rec.category) rec.category = clean(r[1]);
        if (!rec.campus) rec.campus = clean(r[9]);
        if (!rec.link) rec.link = clean(r[10]);
        if (r[8] && clean(r[8]) && clean(r[8]) !== 'NA') rec.summary = clean(r[8]);
        if (!rec.schools) rec.schools = clean(r[7]);
        if (!rec.accom && /^campus|^hotel/i.test(clean(r[9]))) rec.accom = clean(r[9]);
        if (startP && rec.start && fmt(rec.start) !== fmt(startP)) rec.flags.add(`Proper start ${fmt(startP)} vs Hub ${fmt(rec.start)}`);
        if (endP && rec.end && fmt(rec.end) !== fmt(endP)) rec.flags.add(`Proper end ${fmt(endP)} vs Hub ${fmt(rec.end)}`);
        if (startP && !rec.start) { rec.start = startP; }
        if (endP && !rec.end) { rec.end = endP; }
        const n11 = clean(r[11]);
        if (n11 && n11 !== 'error') rec.flags.add(`Proper note: ${n11}`);
        rec.flags.add('Also in Proper');
    }
}

// --- finalize status / notes / sanity ------------------------------------------
for (const rec of recs) {
    rec.status = normStatus(rec.statusRaw, rec.lists[0]);
    // if the scholar appears in Completed with a status but also in a non-completed list, note it
    if (rec.lists.includes('Completed') && rec.lists.some(l => l !== 'Completed' && l !== 'Upcoming - Important'))
        rec.flags.add('Listed in Completed AND another Hub list');
    if (rec.start && rec.end && serialOf(rec.end) < serialOf(rec.start))
        rec.flags.add(`End ${fmt(rec.end)} precedes Start ${fmt(rec.start)} — verify`);
    if (rec.lists.length > 1) {
        const dup = [...new Set(rec.lists)].join('; ');
        rec.flags.add(`Sources: ${dup}`);
    }
    rec.notes = [...rec.flags].join(' | ');
}

// --- write ----------------------------------------------------------------------
const HEADERS = [
    'Scholar Name', 'Category', 'University', 'Country', 'QS Ranking', 'Duration / Days',
    'Start Date', 'End Date', 'Schools / Department', 'Accommodation / Campus',
    'Status', 'Email', 'Mobile', 'Remarks / Summary', 'Drive Link', 'Source Lists', 'Notes'
];
const outRows = [];
const audit = [];

for (const rec of recs) {
    const start = rec.start ? serialOf(rec.start) : null;
    const end = rec.end ? serialOf(rec.end) : null;
    const schoolLabel = rec.schools || (rec.summary ? 'NA' : '');
    const remarks = rec.remarks || rec.summary || (rec.statusRaw ? '' : '');
    outRows.push([
        rec.name, rec.category || '', rec.uni || '', rec.country || '', rec.qs || '', rec.days || '',
        start, end,
        schoolLabel, rec.accom || rec.campus || '',
        rec.status, rec.email || '', rec.mobile || '',
        remarks, rec.link || '',
        [...new Set(rec.lists)].join('; '), rec.notes
    ]);
    audit.push([rec.name, rec.uni || '', rec.status, fmt(rec.start), fmt(rec.end), [...new Set(rec.lists)].join('+'), rec.notes]);
}

const ORDER = { 'Completed': 0, 'Upcoming': 1, 'In Progress': 2, 'Not Coming': 3, 'Canceled': 4 };
outRows.sort((a, b) =>
    (ORDER[a[10]] ?? 9) - (ORDER[b[10]] ?? 9) ||
    (a[6] == null ? 1e12 : a[6]) - (b[6] == null ? 1e12 : b[6]) ||
    String(a[0]).localeCompare(String(b[0]))
);
audit.sort((a, b) => (ORDER[a[2]] ?? 9) - (ORDER[b[2]] ?? 9) || String(a[0]).localeCompare(String(b[0])));

const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...outRows]);
for (let r = 1; r <= outRows.length; r++) {
    for (const c of [6, 7]) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = 'dd-mmm-yyyy';
    }
}
ws['!cols'] = [34, 14, 32, 14, 12, 10, 12, 12, 22, 16, 11, 26, 16, 60, 46, 26, 60].map(w => ({ wch: w }));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Scholars in Residence');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Scholar Name', 'University', 'Status', 'Start', 'End', 'Source Lists', 'Notes'], ...audit
]), 'Comparison');
XLSX.writeFile(wb, OUT, { cellStyles: true });

// --- console report ----------------------------------------------------------------
console.log('WROTE:', OUT);
console.log('==================================================');
console.log('SCHOLAR VISITS:', outRows.length);
const byStatus = {};
for (const r of outRows) byStatus[r[10]] = (byStatus[r[10]] || 0) + 1;
console.log('by status:', Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join(', '));
console.log();
for (const a of audit) {
    console.log(`\n-- ${a[0]}  [${a[2]}]  ${a[1]}`);
    console.log(`   ${a[3]} -> ${a[4]}  (${a[5]})`);
    if (a[6]) console.log(`   FLAGS: ${a[6]}`);
}
