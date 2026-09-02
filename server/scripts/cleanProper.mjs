// Normalize the pasted "MoU Update" sheet from Proper .xlsx into one clean,
// ERP-import-ready workbook.
//
// The sheet is 9 stacked paste-blocks, each with its own column layout:
//   B1  rows 1-75    Date|Country|University|Completed Date|MoU Status|Zip (+stray col)
//   B2  rows 76-94   SL NO|Date|UNIVERSITY|COUNTRY|LINK|MoU Term|MoU Status (2019-era)
//   B3+ rows 95-269  SL NO|DATE|COUNTRY|UNIVERSITY|SCHOOL|COMPLETED ON|STATUS|REMARKS|
//                    CONTACT(EMAIL|PERSON)*|AGREEMENT|DOC LINK|(PERSON|EMAIL)|record|MoU Term|MoU Status
//   * the CONTACT PERSON / CONTACT EMAIL columns SWAP position at row 146.
//
// Everything is mapped by header name, so the swap is handled automatically.
// All dates -> real Excel serials displayed as dd/mm/yyyy.
// True duplicate submissions are removed; everything else is kept and logged.
import XLSX from 'xlsx';

const FILE = 'C:/Users/saish/Downloads/Proper .xlsx';
const OUT = 'C:/Users/saish/Downloads/Proper-cleaned.xlsx';

const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['MoU Update'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

// Output columns match the ERP import mapping for mou-updates
// (controllers/import.controller.js). "Remarks" is kept for the team's
// reference; the import ignores it.
const OUT_HEADERS = [
    'Date', 'Country', 'University', 'Department', 'Completed Date', 'MoU Status',
    'Contact Person', 'Contact Email', 'Agreement Type', 'Term', 'Validity Status',
    'Drive Link', 'Remarks'
];

// Manual recoveries: source sheet row -> { date } override.
// Row 257 (University of Cardiff) had the "5/21/0202" year typo; the user
// confirmed the year is 2026 -> 21/05/2026.
const RECOVER = {
    257: { date: '5/21/2026' }
};

const log = [];
const logRow = (block, sheetRow, field, action, detail) =>
    log.push([`Block ${block}`, sheetRow || '', field, action, detail || '']);

const normH = (h) => String(h || '').toLowerCase().replace(/[^a-z]/g, '');
const empty = (r) => !r || r.every(c => c == null || c === '');
const str = (v) => String(v ?? '').trim();
const serialOf = (p) => Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(1899, 11, 30)) / 86400000);
const fmt = (p) => `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}`;

// ---------------------------------------------------------------------------
// Date parsing: serial | dd-mm-yyyy | d/m/yy (slash fingerprint of this file).
// Returns { p: {y,m,d} | null, note } — "note" carries anything to flag.
// ---------------------------------------------------------------------------
function parseDate(v) {
    if (v == null || v === '') return { p: null, note: null };
    if (v instanceof Date) return { p: { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate() }, note: null };
    if (typeof v === 'number') {
        if (v < 40000 || v > 50000) return { p: null, note: `unusual serial ${v} (outside 2009-2036)` };
        const q = XLSX.SSF.parse_date_code(v);
        return q ? { p: { y: q.y, m: q.m, d: q.d }, note: null } : { p: null, note: `unparseable serial ${v}` };
    }
    const s = str(v);
    const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (!m) return { p: null, note: `"${s}" is not a parseable date` };
    const [, A, B, Y] = m;
    let y = +Y;
    if (Y.length === 2) y = 2000 + y;            // "25" -> 2025 (all data is 2019-2027)
    if (y < 1900) return { p: null, note: `"${s}" year typo (${y}) — likely digit transposition` };
    let d, mo, note = null;
    if (s.includes('-')) {                        // dd-mm-yyyy fingerprint
        d = +A; mo = +B;
        if (+A <= 12 && +B <= 12) note = 'ambiguous dd/mm vs mm/dd, read dd/mm';
    } else {                                      // slash dates in this file are d/m
        if (+A > 12)      { d = +A; mo = +B; }
        else if (+B > 12) { d = +B; mo = +A; }    // mm/dd (e.g. the 5/21 typo)
        else              { d = +A; mo = +B; note = 'ambiguous d/m vs m/d, read d/m (block fingerprint)'; }
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return { p: null, note: `"${s}" is an impossible date` };
    const chk = new Date(Date.UTC(y, mo - 1, d));
    if (chk.getUTCMonth() + 1 !== mo || chk.getUTCDate() !== d) return { p: null, note: `"${s}" is an impossible date` };
    return { p: { y, m: mo, d }, note };
}

// ---------------------------------------------------------------------------
// Header detection + per-block column mapping (by header name).
//
// A row is a header ONLY if >=3 cells normalize to an EXACT known header label
// ("date", "university", "moustatus", ...). Substring matching is not enough —
// continuation data rows ("11 | 45021 | Italy | University of Messina | ...")
// contain "university" and "completed" as substrings and would otherwise be
// mistaken for headers, truncating their block and dropping every date/country.
// ---------------------------------------------------------------------------
const HEADER_TOKENS = new Set([
    'slno', 'date', 'country', 'university', 'school', 'department',
    'completedon', 'completeddate', 'status', 'remarks', 'remark',
    'contaactemail', 'contactemail', 'email', 'agreement', 'doclink', 'link',
    'mouterm', 'moustatus', 'record', 'zip', 'validity', 'contactperson', 'person'
]);
const isHeader = (r) => {
    if (!r || empty(r)) return false;
    const exact = r.filter(c => c != null && HEADER_TOKENS.has(normH(c)));
    return exact.length >= 3;
};

function buildMap(header) {
    const map = { ignore: [] };
    header.forEach((cell, idx) => {
        if (cell == null) return;
        const h = normH(cell);
        if (!h) return;
        if (h === 'slno' || h.includes('record')) { map.ignore.push(idx); return; }
        if (h.includes('completed')) { map.completed = idx; return; }
        if (h === 'date')            { map.date = idx; return; }
        if (h.includes('country'))   { map.country = idx; return; }
        if (h.includes('university')){ map.university = idx; return; }
        if (h.includes('school') || h.includes('department')) { map.department = idx; return; }
        if (h === 'status')          { map.mouStatus = idx; return; }       // the STATUS col (Completed/In Process)
        if (h === 'moustatus' || h.includes('validity')) { map.validityOrMou = idx; return; } // ambiguous "MoU Status"
        if (h.includes('person'))    { map.person = idx; return; }
        if (h.includes('email'))     { map.email = idx; return; }
        if (h.includes('agreement')) { map.agreement = idx; return; }
        if (h.includes('term'))      { map.term = idx; return; }
        if (h.includes('link') || h.includes('zip')) { map.link = idx; return; }
        if (h.includes('remark'))    { map.remarks = idx; return; }
    });
    return map;
}

// Disambiguate the "MoU Status" header by its VALUES:
//   Active/Expired -> Validity Status;  Completed/In Process -> MoU Status.
function resolveValidityOrMou(map, dataRows, blockNo) {
    if (map.validityOrMou == null) return;
    const vals = dataRows.map(r => (r && r[map.validityOrMou] != null ? str(r[map.validityOrMou]) : '')).filter(Boolean);
    const text = vals.join(' ').toLowerCase();
    const isValidity = /expir|active/.test(text) && !/in ?process|complet/.test(text);
    map[isValidity ? 'validity' : 'mouStatus'] = map.validityOrMou;
    logRow(blockNo, '', 'MoU Status column', 'mapped',
        `values "${[...new Set(vals)].slice(0, 4).join(', ')}" -> ${isValidity ? 'Validity Status' : 'MoU Status'}`);
}

// ---------------------------------------------------------------------------
// Main pass, block by block.
// ---------------------------------------------------------------------------
const headerRows = [];
for (let i = 0; i < rows.length; i++) if (isHeader(rows[i])) headerRows.push(i);

const outRows = [];          // final rows (arrays), header not yet included
const dropped = { dup: 0, noKey: 0 };
const sigSeen = new Set();

for (let b = 0; b < headerRows.length; b++) {
    const blockNo = b + 1;
    const hIdx = headerRows[b];
    const end = (b + 1 < headerRows.length ? headerRows[b + 1] : rows.length) - 1;
    const map = buildMap(rows[hIdx]);
    const dataRows = rows.slice(hIdx + 1, end + 1).filter(r => !empty(r));
    resolveValidityOrMou(map, dataRows, blockNo);

    for (const r of dataRows) {
        const sheetRow = rows.indexOf(r) + 1;   // 1-based original sheet row

        const recover = RECOVER[sheetRow];
        const dateP = recover && recover.date ? parseDate(recover.date) : parseDate(r[map.date]);
        if (recover && recover.date && dateP.p) logRow(blockNo, sheetRow, 'Date', 'recovered', `user-provided "${recover.date}" -> ${fmt(dateP.p)}`);
        const compP = parseDate(r[map.completed]);
        if (dateP.note) logRow(blockNo, sheetRow, 'Date', 'date note', dateP.note);
        if (compP && compP.note) logRow(blockNo, sheetRow, 'Completed Date', 'date note', compP.note);
        if (!dateP.p) logRow(blockNo, sheetRow, 'Date', 'unresolved', `value ${JSON.stringify(r[map.date])}`);

        // A date-string sitting in Country/University is data in the wrong
        // column (e.g. the "5/21/0202" typo). Null it so the required gate
        // below skips the row instead of emitting a garbage value.
        [['Country', map.country], ['University', map.university]].forEach(([f, c], i) => {
            const v = r[c];
            if (v != null && typeof v === 'string' && /^\d{1,4}[/\-.]\d{1,4}[/\-.]\d{2,4}$/.test(str(v))) {
                logRow(blockNo, sheetRow, f, 'FLAG', `looks like a date, not a ${f.toLowerCase()}: "${str(v).slice(0, 40)}" — row needs a real ${f.toLowerCase()}`);
                if (i === 0) r[map.country] = null; else r[map.university] = null;
            }
        });

        const country = str(r[map.country]);
        const university = str(r[map.university]);

        // Required-field gate: date, university, country are required in the schema.
        if (!dateP.p || !university || !country) {
            dropped.noKey++;
            logRow(blockNo, sheetRow, 'row', 'SKIPPED',
                `missing required ${[!dateP.p ? 'Date' : '', !university ? 'University' : '', !country ? 'Country' : ''].filter(Boolean).join(', ')}`);
            continue;
        }

        const rowOut = [
            dateP.p ? serialOf(dateP.p) : null,
            country,
            university,
            str(r[map.department]),
            compP.p ? serialOf(compP.p) : null,
            str(r[map.mouStatus]),
            str(r[map.person]),
            str(r[map.email]),
            str(r[map.agreement]),
            str(r[map.term]),
            str(r[map.validity]),
            str(r[map.link]),
            str(r[map.remarks])
        ];

        // Flag any mapped-but-weird values (e.g. a date sitting in Country).
        [['Country', map.country], ['University', map.university]].forEach(([f, c]) => {
            const v = r[c];
            if (v != null && typeof v === 'string' && /^\d{1,4}[/\-.]\d{1,4}[/\-.]\d{2,4}$/.test(str(v))) {
                logRow(blockNo, sheetRow, f, 'FLAG', `looks like a date, not a ${f.toLowerCase()}: "${str(v).slice(0, 40)}"`);
            }
        });

        // Unmapped cells outside the header (block 1's stray date column etc.)
        const known = new Set([...Object.values(map), ...map.ignore]);
        r.forEach((v, idx) => {
            if (v == null || v === '' || known.has(idx)) return;
            logRow(blockNo, sheetRow, `col ${idx}`, 'unmapped value', `"${str(v).slice(0, 40)}"`);
        });

        // Dedup on a full normalized signature.
        const sig = rowOut.map(str).join('|').toLowerCase().replace(/\s+/g, ' ');
        if (sigSeen.has(sig)) {
            dropped.dup++;
            logRow(blockNo, sheetRow, 'row', 'duplicate removed',
                `identical to an earlier row (${university.slice(0, 40)})`);
            continue;
        }
        sigSeen.add(sig);
        outRows.push(rowOut);
    }
}

// ---------------------------------------------------------------------------
// Write output: MoU Update first (import reads sheet #1), Cleanup Log second.
// ---------------------------------------------------------------------------
const aoa = [OUT_HEADERS, ...outRows];
const outWs = XLSX.utils.aoa_to_sheet(aoa);
// Stamp dd/mm/yyyy display on every Date / Completed Date cell (cols 0 and 4).
for (let r = 1; r <= outRows.length; r++) {
    for (const c of [0, 4]) {
        const cell = outWs[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = 'dd/mm/yyyy';
    }
}
// Column widths for readability.
outWs['!cols'] = [11, 12, 38, 26, 13, 11, 22, 26, 20, 10, 13, 46, 30].map(w => ({ wch: w }));

const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, outWs, 'MoU Update');
if (log.length) {
    const logAoa = [['Block', 'Sheet Row', 'Field', 'Action', 'Detail'], ...log];
    XLSX.utils.book_append_sheet(newWb, XLSX.utils.aoa_to_sheet(logAoa), 'Cleanup Log');
}

// Excel often has the previous output open (EBUSY). Retry with a numbered
// suffix so a locked file never stops the run.
function writeWithRetry(newWb, base) {
    let candidate = base;
    for (let i = 2; i < 100; i++) {
        try {
            XLSX.writeFile(newWb, candidate, { cellStyles: true });
            return candidate;
        } catch (e) {
            if (e.code === 'EBUSY' || e.code === 'EPERM') {
                candidate = base.replace(/\.xlsx$/, ` (${i}).xlsx`);
                continue;
            }
            throw e;
        }
    }
    throw new Error('Could not write output — close the old file in Excel and re-run.');
}
const WRITTEN = writeWithRetry(newWb, OUT);

// ---------------------------------------------------------------------------
// Self-verification pass (reads the file back, independently).
// ---------------------------------------------------------------------------
const back = XLSX.readFile(WRITTEN, { cellStyles: true });
const backRows = XLSX.utils.sheet_to_json(back.Sheets['MoU Update'], { header: 1, defval: null });
let textDates = 0, empties = 0, dupGroups = 0;
const sigs = new Set();
for (let i = 1; i < backRows.length; i++) {
    const r = backRows[i];
    if (r.every(c => c == null || c === '')) { empties++; continue; }
    for (const c of [0, 4]) {
        if (r[c] != null && typeof r[c] === 'string') { textDates++; break; }
    }
    const sig = r.map(str).join('|').toLowerCase().replace(/\s+/g, ' ');
    if (sigs.has(sig)) dupGroups++; else sigs.add(sig);
}
const fmtOK = !textDates && !empties && !dupGroups;

console.log('WROTE:', WRITTEN);
console.log('-----------------------------');
console.log(`records kept : ${outRows.length}`);
console.log(`skipped (missing required) : ${dropped.noKey}`);
console.log(`duplicates removed         : ${dropped.dup}`);
console.log(`cleanup log entries        : ${log.length}`);
console.log('-----------------------------');
console.log(`VERIFY: text dates left = ${textDates}, empty rows = ${empties}, dup groups = ${dupGroups} -> ${fmtOK ? 'OK' : 'REVIEW'}`);
console.log('Block columns mapped:');
const dataRowsFor = (b) => {
    const end = (b + 1 < headerRows.length ? headerRows[b + 1] : rows.length) - 1;
    return rows.slice(headerRows[b] + 1, end + 1);
};
for (let b = 0; b < headerRows.length; b++) {
    const map = buildMap(rows[headerRows[b]]);
    const data = dataRowsFor(b).filter(r => !empty(r));
    resolveValidityOrMou(map, data, b + 1);
    console.log(`  Block ${b + 1} (${data.length} data rows): date@${map.date} country@${map.country} uni@${map.university} dept@${map.department} completed@${map.completed} mouStatus@${map.mouStatus} person@${map.person} email@${map.email} agreement@${map.agreement} term@${map.term} validity@${map.validity} link@${map.link} remarks@${map.remarks}`);
}
