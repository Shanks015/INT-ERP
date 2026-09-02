// Review dump for Proper-cleaned.xlsx:
// 1. Full Cleanup Log
// 2. Source-row detail for every row the cleaner SKIPPED
// 3. Universities appearing more than once in the output (candidate dupes),
//    with every field compared so we can tell true dupes from MoU+Student-Exchange pairs.
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// The cleaner falls back to "Proper-cleaned (N).xlsx" when Excel has the main
// file locked, so resolve the newest written output rather than guessing.
const DL = 'C:/Users/saish/Downloads';
const cands = fs.readdirSync(DL)
    .filter(f => /^Proper-cleaned( \(\d+\))?\.xlsx$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(DL, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
const OUT = cands.length ? path.join(DL, cands[0].f) : path.join(DL, 'Proper-cleaned.xlsx');
const SRC = path.join(DL, 'Proper .xlsx');
console.log('Reading output:', OUT);
const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9@.]+/g, ' ').trim();
const serialToDate = (s) => {
    if (typeof s !== 'number') return s;
    const p = XLSX.SSF.parse_date_code(s);
    return p ? `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}` : s;
};

// 1. Cleanup Log
const wb = XLSX.readFile(OUT, { cellStyles: true });
const logRows = XLSX.utils.sheet_to_json(wb.Sheets['Cleanup Log'], { header: 1, defval: null });
console.log(`--- CLEANUP LOG (${logRows.length - 1} entries) ---`);
for (const r of logRows.slice(1)) {
    console.log(r.map(c => (c == null ? '' : String(c))).join('  |  '));
}

// 2. Source-row detail for skipped rows (reuse the exact-token header detector).
const src = XLSX.readFile(SRC, { cellDates: false });
const srows = XLSX.utils.sheet_to_json(src.Sheets['MoU Update'], { header: 1, defval: null });
const HEADER_TOKENS = new Set([
    'slno', 'date', 'country', 'university', 'school', 'department',
    'completedon', 'completeddate', 'status', 'remarks', 'remark',
    'contaactemail', 'contactemail', 'email', 'agreement', 'doclink', 'link',
    'mouterm', 'moustatus', 'record', 'zip', 'validity', 'contactperson', 'person'
]);
const empty = (r) => !r || r.every(c => c == null || c === '');
const isHeader = (r) => {
    if (!r || empty(r)) return false;
    return r.filter(c => c != null && HEADER_TOKENS.has(String(c || '').toLowerCase().replace(/[^a-z]/g, ''))).length >= 3;
};
const headerIdx = [];
for (let i = 0; i < srows.length; i++) if (isHeader(srows[i])) headerIdx.push(i);
const blockStartOf = (i) => {
    let b = 0;
    while (b + 1 < headerIdx.length && headerIdx[b + 1] < i) b++;
    return b + 1;
};

console.log('\n--- SKIPPED ROWS (source detail) ---');
for (const lr of logRows.slice(1)) {
    if (lr[3] !== 'SKIPPED') continue;
    const block = +(String(lr[0]).replace('Block ', '') || 0);
    const sheetRow = +(lr[1] || 0);
    const hIdx = headerIdx[block - 1];
    const srcRow = srows[sheetRow - 1];
    console.log(`Block ${block} source row ${sheetRow} (${lr[4]}):`);
    console.log('   ' + srcRow.map((c, i) => c == null || c === '' ? `[${i}]=·` : `[${i}]=${serialToDate(c)}`).filter(x => !x.endsWith('·')).join(' '));
}

// 3. Candidate duplicate groups in the output.
const out = XLSX.utils.sheet_to_json(wb.Sheets['MoU Update'], { header: 1, defval: null });
const H = out[0];
const FIELDS = ['Date', 'Country', 'University', 'Department', 'Completed Date', 'MoU Status',
    'Contact Person', 'Contact Email', 'Agreement Type', 'Term', 'Validity Status', 'Drive Link'];
const idx = {};
FIELDS.forEach(f => idx[f] = H.indexOf(f));
const key = (r) => norm(r[idx.University]) + '|' + norm(r[idx.Country]) + '|' + (r[idx.Date] || '');
const groups = {};
for (let i = 1; i < out.length; i++) {
    const r = out[i];
    const k = key(r);
    if (!norm(k)) continue;
    (groups[k] = groups[k] || []).push(i);
}
console.log('\n--- UNIVERSITIES WITH >1 OUTPUT ROW ---');
let shown = 0;
for (const [k, rows] of Object.entries(groups)) {
    if (rows.length < 2) continue;
    if (shown++ > 20) { console.log('...'); break; }
    console.log(`\n${k.slice(0, 70)}  -> output rows ${rows.map(r => '#' + (r + 1)).join(', ')}`);
    for (const ri of rows) {
        const r = out[ri];
        console.log('   ' + FIELDS.map((f, i) => {
            const v = (i === 0 || i === 4) ? serialToDate(r[i]) : (r[i] == null ? '' : String(r[i]).slice(0, 42));
            return v ? `${f}=${v}` : null;
        }).filter(Boolean).join(' | '));
    }
}
