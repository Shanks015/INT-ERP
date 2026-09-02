// Second pass on Proper-cleaned.xlsx -> Proper-final.xlsx (import-ready).
//
// User policy: "Merge identical only".
//  - Rows that are identical except the Drive Link are the SAME record pasted
//    twice -> keep the first, remember the dropped link in Remarks.
//  - Same-date, same-university rows that differ beyond the link (the Block-1
//    sparse rows vs the Blocks-3-6 full rows) are KEPT but logged as
//    "PAIR TO REVIEW" so the data person can confirm each one.
//  - Completed Dates in 2027+ (in the future, impossible for a "Completed"
//    status) are flagged as likely year typos.
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const DL = 'C:/Users/saish/Downloads';
const cands = fs.readdirSync(DL)
    .filter(f => /^Proper-cleaned( \(\d+\))?\.xlsx$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(DL, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
const IN = cands.length ? path.join(DL, cands[0].f) : path.join(DL, 'Proper-cleaned.xlsx');
const OUT = path.join(DL, 'Proper-final.xlsx');

const norm = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const fmt = (s) => { // serial -> dd/mm/yyyy for log text
    if (typeof s !== 'number') return String(s ?? '');
    const p = XLSX.SSF.parse_date_code(s);
    return p ? `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}` : String(s);
};

const wb = XLSX.readFile(IN, { cellStyles: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets['MoU Update'], { header: 1, defval: null });
const H = rows[0];

// OUT_HEADERS order: 0 Date, 1 Country, 2 University, 3 Department, 4 Completed Date,
// 5 MoU Status, 6 Contact Person, 7 Contact Email, 8 Agreement Type, 9 Term,
// 10 Validity Status, 11 Drive Link, 12 Remarks
const LINK = 11, REM = 12, COMP = 4;

const mergeLog = [];
const logRow = (type, rowA, rowB, detail) =>
    mergeLog.push([type, rowA ? rowA + 1 : '', rowB ? rowB + 1 : '', detail || '']);

// 1) Group by normalized university|country|date serial.
const groups = new Map();
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => c == null || c === '')) continue;
    const k = [norm(r[1]), norm(r[2]), String(r[0] ?? '')].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
}

// 2) Per group: merge identical-except-link rows; log the rest as review pairs.
const sigNoLink = (r) => r.map((c, i) => (i === LINK || i === REM) ? '' : norm(c)).join('|');
let dropped = 0;
const kept = new Set();

for (const [k, idxs] of groups) {
    if (idxs.length < 2) { kept.add(idxs[0]); continue; }
    const seen = new Map(); // sigNoLink -> first row index
    const survivors = [];
    for (const i of idxs) {
        const sig = sigNoLink(rows[i]);
        if (seen.has(sig)) {
            const first = seen.get(sig);
            const link = rows[i][LINK];
            rows[first][REM] = [rows[first][REM],
                `(merged duplicate — second Drive Link: ${link ?? ''})`].filter(Boolean).join(' ');
            dropped++;
            logRow('DUP MERGED', first, i,
                `same record, two Drive links: ${fmt(rows[first][LINK])?.slice(0, 45)} <> ${String(link ?? '').slice(0, 45)}`);
            continue;
        }
        seen.set(sig, i);
        survivors.push(i);
    }
    if (survivors.length > 1) {
        for (let a = 0; a < survivors.length; a++) for (let b = a + 1; b < survivors.length; b++) {
            const ra = rows[survivors[a]], rb = rows[survivors[b]];
            const diffs = [];
            for (let c = 0; c < Math.max(ra.length, rb.length); c++) {
                if (c === REM) continue;
                const va = norm(ra[c]), vb = norm(rb[c]);
                if (va !== vb) diffs.push(`${H[c] || 'col' + c}: "${String(ra[c] ?? '').slice(0, 24)}" <> "${String(rb[c] ?? '').slice(0, 24)}"`);
            }
            logRow('PAIR TO REVIEW', survivors[a], survivors[b], diffs.slice(0, 8).join(' | '));
        }
    }
    for (const i of survivors) kept.add(i);
}

// 3) Flag impossible future Completed Dates (status "Completed" cannot be in 2027+).
for (let i = 1; i < rows.length; i++) {
    const v = rows[i][COMP];
    if (typeof v === 'number') {
        const p = XLSX.SSF.parse_date_code(v);
        if (p && p.y >= 2027) {
            logRow('VERIFY DATE', i, '',
                `Completed Date ${fmt(v)} is in the future for a "Completed" status — likely year typo`);
        }
    }
}

// 4) Rebuild in original sheet order.
const ordered = [rows[0]];
for (let i = 1; i < rows.length; i++) if (kept.has(i)) ordered.push(rows[i]);

// 5) Write: MoU Update (sheet 1, import reads it), Cleanup Log (carried over),
//    Merge Log (this pass).
const outWs = XLSX.utils.aoa_to_sheet(ordered);
for (let r = 1; r < ordered.length; r++) {
    for (const c of [0, 4]) {
        const cell = outWs[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = 'dd/mm/yyyy';
    }
}
outWs['!cols'] = [11, 12, 38, 26, 13, 11, 22, 26, 20, 10, 13, 46, 30].map(w => ({ wch: w }));

const newWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWb, outWs, 'MoU Update');
if (wb.Sheets['Cleanup Log']) {
    const origLog = XLSX.utils.sheet_to_json(wb.Sheets['Cleanup Log'], { header: 1, defval: null });
    XLSX.utils.book_append_sheet(newWb, XLSX.utils.aoa_to_sheet(origLog), 'Cleanup Log');
}
if (mergeLog.length) {
    XLSX.utils.book_append_sheet(newWb,
        XLSX.utils.aoa_to_sheet([['Type', 'Row A', 'Row B', 'Detail'], ...mergeLog]), 'Merge Log');
}

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

// 6) Self-verification.
const back = XLSX.readFile(WRITTEN, { cellStyles: true });
const backRows = XLSX.utils.sheet_to_json(back.Sheets['MoU Update'], { header: 1, defval: null });
let textDates = 0, empties = 0, dupSig = 0;
const sigs = new Set();
for (let i = 1; i < backRows.length; i++) {
    const r = backRows[i];
    if (r.every(c => c == null || c === '')) { empties++; continue; }
    for (const c of [0, 4]) if (r[c] != null && typeof r[c] === 'string') { textDates++; break; }
    const sig = r.map(norm).join('|');
    if (sigs.has(sig)) dupSig++; else sigs.add(sig);
}
const fmtOK = !textDates && !empties && !dupSig;

const reviewCount = mergeLog.filter(l => l[0] === 'PAIR TO REVIEW').length;
console.log('IN     :', IN);
console.log('WROTE  :', WRITTEN);
console.log('-----------------------------');
console.log(`records in          : ${rows.length - 1}`);
console.log(`records out         : ${ordered.length - 1}`);
console.log(`identical merged    : ${dropped}`);
console.log(`pairs flagged review: ${reviewCount}`);
console.log(`merge log entries   : ${mergeLog.length}`);
console.log('-----------------------------');
console.log(`VERIFY: text dates left = ${textDates}, empty rows = ${empties}, dup signatures = ${dupSig} -> ${fmtOK ? 'OK' : 'REVIEW'}`);
console.log('\nMerge Log:');
for (const l of mergeLog) console.log(`  ${l[0]}  rows ${l[1] || '-'} / ${l[2] || '-'}  ${String(l[3]).slice(0, 130)}`);
