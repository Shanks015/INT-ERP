// buildMouExtract.mjs — merge every _mou_out/<label>.json produced by the
// fan-out agents into one data-first workbook: mou-extracted.xlsx.
// MoU-Update-style columns + traceability (Year Folder, Source Files).
import XLSX from 'xlsx';
import { readdirSync, readFileSync } from 'fs';

const DIR = 'C:/Users/saish/Downloads/_mou_out';
const OUT = 'C:/Users/saish/Downloads/mou-extracted.xlsx';

const str = (v) => String(v ?? '').trim();
const clean = (s) => str(s).replace(/\s+/g, ' ');
const empty = (r) => !r || r.every(c => c == null || c === '');

// --- date -> Excel serial (rejects year < 2000) -----------------------------
function parseDate(v) {
    const s = str(v);
    if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
        const [y, mo, d] = [+m[1], +m[2], +m[3]];
        if (y < 2000 || y > 2040 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
        return { y, m: mo, d };
    }
    m = s.match(/^(\d{4})$/);                       // year only
    if (m) {
        const y = +m[1];
        if (y < 2000 || y > 2040) return null;
        return { y, m: 0, d: 0 };                   // year-only marker
    }
    return null;
}
const serialOf = (p) => p && p.m ? Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(1899, 11, 30)) / 86400000) : null;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (p) => p && p.m ? `${String(p.d).padStart(2, '0')}-${MONTH_ABBR[p.m - 1]}-${p.y}` : (p ? String(p.y) : '');

// --- load all agent JSON ------------------------------------------------------
const files = readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_') && f !== 'meta.json').sort();
const recs = [];
const byFile = [];
for (const f of files) {
    let data;
    try { data = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8')); }
    catch (e) { byFile.push([f, 'UNPARSEABLE', `error: ${e.message}`]); continue; }
    const list = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : []);
    if (!list.length) { byFile.push([f, 'EMPTY', 'no records in file']); }
    else byFile.push([f, list.length, '']);
    for (const r of list) recs.push({ ...r, _file: f });
}

// --- normalize / derive ---------------------------------------------------------
const normUni = (s) => clean(s).toLowerCase().replace(/^(the |university of |universidad de )/, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// collapse the three draft/in-progress spellings the agents produced into one label
const normStatus = (s) => {
    const t = String(s ?? '').toLowerCase();
    if (/not signed|no signature|unsigned/.test(t)) return 'Not Signed';
    if (/signed/.test(t)) return 'Signed';
    if (/expired/.test(t)) return 'Expired';
    if (/draft|in progress|in-progress/.test(t)) return 'In Progress (Draft)';
    return clean(s);
};
// chunk label -> plain year for the Year column ("2023-A" -> 2023, "WIP" -> Work in Prog)
const plainYear = (label) => /^20\d\d/.test(label) ? label.slice(0, 4) : (label === 'WIP' ? 'Work in Prog' : label);

const HEADERS = [
    'Date', 'Country', 'University', 'Department', 'Completed Date', 'MoU Status',
    'Contact Person', 'Contact Email', 'Agreement Type', 'Term', 'Validity Status',
    'Drive Link', 'Remarks', 'Year', 'Source Files'
];
const outRows = [];
const dupCheck = new Map();

for (const r of recs) {
    const dateP = parseDate(r.date);
    const chunkLabel = r._file.replace(/\.json$/, '');
    const yearFolder = plainYear(chunkLabel);
    const uni = clean(r.university) || clean(r.folder);
    const uk = normUni(uni);
    if (dupCheck.has(uk)) {
        const prev = dupCheck.get(uk);
        prev.dup.push(chunkLabel);
        prev.row._dupNote = true;
    } else dupCheck.set(uk, { row: null, dup: [] });

    const row = {
        dateP,
        dateCell: serialOf(dateP) ?? (dateP && !dateP.m ? fmt(dateP) : ''),  // serial, or "YYYY" text
        country: clean(r.country),
        university: uni,
        department: clean(r.department),
        completedDate: '',
        mouStatus: normStatus(r.status),
        contactPerson: clean(r.contactPerson),
        contactEmail: clean(r.contactEmail),
        agreementType: clean(r.agreementType),
        term: clean(r.term),
        validityStatus: clean(r.validityStatus),
        driveLink: clean(r.driveLink),
        remarks: clean(r.remarks),
        yearFolder,
        sourceFiles: clean(r.sourceFiles),
    };
    dupCheck.get(uk).row = row;
    outRows.push(row);
}

// append duplicate-folders note to remarks
for (const v of dupCheck.values()) {
    if (v.dup.length > 1 && v.row) {
        v.row.remarks = [v.row.remarks, `ALSO IN: ${v.dup.join(', ')}`].filter(Boolean).join(' | ');
    }
}

// --- sort: year folder, then date, then university -------------------------------
const yearKey = (y) => (y === '2022' ? 2022 : /^20\d\d/.test(y) ? +y.slice(0, 4) : 9999);
outRows.sort((a, b) =>
    yearKey(a.yearFolder) - yearKey(b.yearFolder) ||
    (a.dateP && a.dateP.m ? serialOf(a.dateP) : 1e12) - (b.dateP && b.dateP.m ? serialOf(b.dateP) : 1e12) ||
    a.university.localeCompare(b.university)
);

// --- write -----------------------------------------------------------------------
const aoa = [HEADERS, ...outRows.map(r => [
    r.dateCell, r.country, r.university, r.department, r.completedDate, r.mouStatus,
    r.contactPerson, r.contactEmail, r.agreementType, r.term, r.validityStatus,
    r.driveLink, r.remarks, r.yearFolder, r.sourceFiles
])];
const ws = XLSX.utils.aoa_to_sheet(aoa);
// date display format on Date (col 0); Completed Date col 4 would be serials too
for (let i = 1; i <= outRows.length; i++) {
    const cell = ws[XLSX.utils.encode_cell({ r: i, c: 0 })];
    if (cell && cell.t === 'n') cell.z = 'dd-mmm-yyyy';
}
ws['!cols'] = [12, 14, 44, 26, 12, 16, 30, 26, 22, 12, 14, 42, 70, 10, 60].map(w => ({ wch: w }));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'MoU Extraction');
// audit sheet: per-source-file tally + issues
const issues = [];
for (const r of outRows) {
    if (!r.country) issues.push([r.university, r.yearFolder, 'no country']);
    if (!r.dateCell) issues.push([r.university, r.yearFolder, 'no date']);
    if (!r.mouStatus) issues.push([r.university, r.yearFolder, 'no status']);
    if (!r.agreementType) issues.push([r.university, r.yearFolder, 'no agreement type']);
}
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Source file', 'Records', 'Note'], ...byFile
]), 'By Source');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['University', 'Year', 'Missing field'], ...issues
]), 'Missing Fields');
XLSX.writeFile(wb, OUT, { cellStyles: true });

// --- console report ---------------------------------------------------------------
console.log('WROTE:', OUT);
console.log('==================================================');
console.log('RECORDS      :', outRows.length);
console.log('source files :', files.length);
console.log('by file      :');
for (const [f, n, note] of byFile) console.log(`  ${f}: ${n}${note ? '  ' + note : ''}`);
console.log();
console.log('MISSING-FIELD ITEMS:', issues.length);
for (const [u, y, m] of issues.slice(0, 40)) console.log(`  [${y}] ${u}: ${m}`);
