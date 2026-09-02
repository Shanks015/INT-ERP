// clean_campus.mjs — Produce the three cleaned per-module workbooks from the ORIGINAL
// "FResh Campus visits.xlsx" (which is left untouched). READ-ONLY on the source; writes
// new *_CLEANED_*.xlsx files in Downloads.
//
// Decisions encoded (from the user):
//   1. Split into 3 modules: Campus Visit (University Visit), Guest Lecture / Seminar, Consultant Visit / Masters Desk.
//   2. Corporate Collaboration row (Junction 91, source row 102) -> under University Visit (Campus module).
//   3. The 3 "Other" scholar rows (source rows 105, 109, 113) stay in BOTH Scholars and Campus Visits.
//   4. 4 University-Visit rows that are actually lectures/sessions (source rows 2, 68, 114, 115) -> reclassified as
//      'Guest Lecture' in the Seminar module.
//   5. Dates: 6 rows whose summary prose names a date that is the exact day/month swap of the serial decode
//      (rows 98, 102, 107, 108, 109, 110) -> prose date wins. All others -> serial formula / dd-mmm-yyyy text
//      decoded day-first. Every cleaned date is written as canonical dd/MMM/yyyy TEXT so the import endpoint's
//      text path parses it exactly.
//   6. No dupes, no blank required cells (validated separately).
import XLSX from 'xlsx';

const SRC = 'C:/Users/saish/Downloads/FResh Campus visits.xlsx';
const OUT_DIR = 'C:/Users/saish/Downloads';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const M_INDEX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const fmtDDMMM = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${MONTHS[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
const parseDDMMM = (s) => {
    const m = String(s).trim().match(/^(\d{1,2})\/([A-Z][a-z]{2})\/(\d{4})$/);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[3], M_INDEX[m[2]], +m[1]));
    return (d.getUTCFullYear() === +m[3] && d.getUTCMonth() === M_INDEX[m[2]] && d.getUTCDate() === +m[1]) ? d : null;
};
const serialDate = (v) => new Date(Math.round((v - 25569) * 86400 * 1000)); // Excel 1900, day-first authoring
const textDate = (s) => {
    const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return null;
    const dd = +m[1], mm = +m[2];
    let y = +m[3];
    if (m[3].length === 2) y += (y <= 50 ? 2000 : 1900);
    const d = new Date(Date.UTC(y, mm - 1, dd));
    if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
    return d;
};

// 6 prose-override rows: source row -> prose dd/MMM/yyyy (user-confirmed)
const PROSE_OVERRIDE = {
    98: '09/Dec/2025',
    102: '05/Feb/2026',
    107: '06/Mar/2026',
    108: '09/Apr/2026',
    109: '02/Apr/2026',
    110: '02/Apr/2026'
};
// 4 University-Visit rows reclassified into the Seminar module as guest lectures
const RECLASSIFY_UV_TO_SEMINAR = new Set([2, 68, 114, 115]);

const wb = XLSX.readFile(SRC);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const header = rows[0];
// clean header labels: keep original but normalize whitespace. Drive-link header is the
// misspelled original ("Campus Visit- Upload Zip FIle") — the import mapping reads it by pick().
const HEADERS = ['Date', 'Type', "Visitor's Name & Details", 'Country', 'University Name', 'Summary', 'Department', 'Campus', 'Campus Visit- Upload Zip FIle'];

const clean = (v) => (v === null || v === undefined ? '' : String(v).replace(/\s+/g, ' ').trim());

const realRows = [];
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r.slice(0, 8).some((c) => c !== null && c !== undefined && String(c).trim() !== '')) continue;
    realRows.push({ rowNo: i + 1, r });
}

const buckets = {
    campus: { rows: [], notes: [] },      // Campus Visit / University Visit
    seminar: { rows: [], notes: [] },     // Guest Lecture / Seminar
    consultant: { rows: [], notes: [] }   // Consultant Visit / Masters Desk
};

const logNote = (bucket, note) => buckets[bucket].notes.push(note);

for (const { rowNo, r } of realRows) {
    const type = clean(r[1]);
    const outRow = {};
    // Date first (may be serial number, dd/mm/yy text, or prose-override string)
    let decoded = null;
    if (typeof r[0] === 'number') decoded = serialDate(r[0]);
    else if (typeof r[0] === 'string' && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(r[0].trim())) decoded = textDate(r[0]);
    const finalDate = PROSE_OVERRIDE[rowNo] ? PROSE_OVERRIDE[rowNo] : (decoded ? fmtDDMMM(decoded) : null);
    if (!finalDate) throw new Error(`row${rowNo}: could not decode date "${r[0]}"`);
    outRow.Date = finalDate;

    // Route by bucket
    let target;
    let outType;
    if (type === 'Seminar') { target = 'seminar'; outType = 'Seminar'; }
    else if (type === 'Consultant Visit') { target = 'consultant'; outType = 'Consultant Visit'; }
    else if (type === 'Corporate Collaboration') { target = 'campus'; outType = 'University Visit'; }      // decision 2
    else if (type === 'Other') { target = 'campus'; outType = 'University Visit'; }                         // decision 3 (also stays in Scholars)
    else if (type === 'University Visit' && RECLASSIFY_UV_TO_SEMINAR.has(rowNo)) { target = 'seminar'; outType = 'Guest Lecture'; } // decision 4
    else if (type === 'University Visit') { target = 'campus'; outType = 'University Visit'; }
    else throw new Error(`row${rowNo}: unknown Type "${type}"`);

    outRow.Type = outType;
    outRow["Visitor's Name & Details"] = clean(r[2]);
    outRow.Country = clean(r[3]);
    outRow['University Name'] = clean(r[4]);
    outRow.Summary = clean(r[5]);
    outRow.Department = clean(r[6]);
    outRow.Campus = clean(r[7]);
    outRow['Campus Visit- Upload Zip FIle'] = clean(r[8]);
    buckets[target].rows.push({ rowNo, ...outRow });

    if (PROSE_OVERRIDE[rowNo]) logNote(target, `row${rowNo} (${outType}): date overridden by prose -> ${finalDate}`);
    if (type !== outType) logNote(target, `row${rowNo}: Type "${type}" -> "${outType}"${target === 'seminar' && type === 'University Visit' ? ' (reclassified: lecture/session in summary)' : ''}`);
}

const writeXlsx = (filename, aoa) => {
    const aoaFull = [HEADERS, ...aoa.map((o) => HEADERS.map((h) => o[h]))];
    const nws = XLSX.utils.aoa_to_sheet(aoaFull);
    // Explicit text cells so dates stay dd/MMM/yyyy text, never re-serialized
    nws['!cols'] = HEADERS.map((_, i) => ({ wch: i === 2 ? 70 : i === 5 ? 80 : i === 8 ? 60 : 22 }));
    const nwb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(nwb, nws, 'Campus Visit');
    XLSX.writeFile(nwb, `${OUT_DIR}/${filename}`);
};

// Per-module files
writeXlsx('FResh Campus visits_CLEANED_CampusVisits.xlsx', buckets.campus.rows.map(({ rowNo, ...o }) => ({ ...o })));
writeXlsx('FResh Campus visits_CLEANED_Seminars.xlsx', buckets.seminar.rows.map(({ rowNo, ...o }) => ({ ...o })));
writeXlsx('FResh Campus visits_CLEANED_ConsultantVisits.xlsx', buckets.consultant.rows.map(({ rowNo, ...o }) => ({ ...o })));

// Audit report
const sortedRows = (b) => b.slice().sort((a, c) => a.rowNo - c.rowNo);
const report = [];
report.push('# Campus visits cleaning report');
report.push('');
report.push(`Source rows processed: ${realRows.length} (114) — none dropped.`);
report.push('');
report.push('## Bucket counts');
report.push(`- Campus Visits (University Visit): ${buckets.campus.rows.length}`);
report.push(`- Guest Lecture / Seminar: ${buckets.seminar.rows.length}`);
report.push(`- Consultant Visit / Masters Desk: ${buckets.consultant.rows.length}`);
report.push('');
report.push('## Campus Visits rows (original order)');
for (const { rowNo } of sortedRows(buckets.campus.rows)) report.push(`- row ${rowNo}`);
report.push('');
report.push('## Seminar / Guest Lecture rows (original order)');
for (const { rowNo } of sortedRows(buckets.seminar.rows)) report.push(`- row ${rowNo}`);
report.push('');
report.push('## Consultant Visit rows (original order)');
for (const { rowNo } of sortedRows(buckets.consultant.rows)) report.push(`- row ${rowNo}`);
report.push('');
report.push('## Actions applied');
const allNotes = [...buckets.campus.notes, ...buckets.seminar.notes, ...buckets.consultant.notes];
if (allNotes.length) { allNotes.forEach((n) => report.push(`- ${n}`)); } else report.push('- none');
report.push('');
report.push('## Files written');
report.push('- FResh Campus visits_CLEANED_CampusVisits.xlsx');
report.push('- FResh Campus visits_CLEANED_Seminars.xlsx');
report.push('- FResh Campus visits_CLEANED_ConsultantVisits.xlsx');
report.push('');
report.push('All dates are canonical dd/MMM/yyyy text. Original spreadsheet untouched.');

const fs = await import('fs');
fs.writeFileSync(`${OUT_DIR}/FResh Campus visits_CLEANED_report.md`, report.join('\n'));

// Console summary
console.log('Buckets:', JSON.stringify({ campus: buckets.campus.rows.length, seminar: buckets.seminar.rows.length, consultant: buckets.consultant.rows.length }));
console.log('Total written:', buckets.campus.rows.length + buckets.seminar.rows.length + buckets.consultant.rows.length);
allNotes.forEach((n) => console.log(' -', n));
console.log('Report: FResh Campus visits_CLEANED_report.md');
