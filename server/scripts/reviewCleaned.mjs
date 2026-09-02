// Import-readiness review of Proper-cleaned.xlsx.
// Checks every condition the ERP import (import.controller.js) depends on:
//  1. First sheet is "MoU Update", header row maps exactly to the import keys
//  2. Date & Completed Date are all REAL serials (numbers) with dd/mm/yyyy format
//  3. No empty required fields (Date, Country, University)
//  4. No same-date duplicate university groups left (beyond the known review pairs)
//  5. Spot-checks a few rows against the source values
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const DL = 'C:/Users/saish/Downloads';
const cands = fs.readdirSync(DL)
    .filter(f => /^Proper-cleaned( \(\d+\))?\.xlsx$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(DL, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
const FILE = cands.length ? path.join(DL, cands[0].f) : path.join(DL, 'Proper-cleaned.xlsx');
console.log('Checking:', FILE);

const wb = XLSX.readFile(FILE, { cellStyles: true });
const ws = wb.Sheets[wb.SheetNames[0]];
console.log(`Sheet 1 name: "${wb.SheetNames[0]}"`);

// 1. Headers
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
const H = rows[0];
const EXPECTED = ['Date', 'Country', 'University', 'Department', 'Completed Date', 'MoU Status',
    'Contact Person', 'Contact Email', 'Agreement Type', 'Term', 'Validity Status', 'Drive Link'];
const missing = EXPECTED.filter(e => !H.includes(e));
const extra = H.filter(h => h && !EXPECTED.includes(h));
console.log('\n[1] HEADERS');
console.log(missing.length ? `  MISSING for import: ${missing.join(', ')}` : '  all 12 import columns present OK');
if (extra.length) console.log(`  extra columns (harmless): ${extra.join(', ')}`);
const I = {}; EXPECTED.forEach(e => I[e] = H.indexOf(e));

// 2. Dates are serials + formatted
const fmtOf = (r, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    return cell ? (cell.z || '(no format)') : '(empty cell)';
};
let textDates = 0, badSerial = 0, noFmt = 0, totalDates = 0;
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => c == null || c === '')) continue;
    for (const c of [0, 4]) {
        const v = r[c];
        if (v == null || v === '') continue;
        totalDates++;
        if (typeof v === 'string') { textDates++; continue; }
        if (typeof v === 'number' && (v < 40000 || v > 50000)) badSerial++;
        if (fmtOf(i, c) !== 'dd/mm/yyyy') noFmt++;
    }
}
console.log('\n[2] DATES');
console.log(`  date cells total: ${totalDates}`);
console.log(`  stored as text (BAD): ${textDates}`);
console.log(`  serials outside 2009-2036 (BAD): ${badSerial}`);
console.log(`  cells without dd/mm/yyyy format (BAD): ${noFmt}`);

// 3. Required fields
let missingDate = 0, missingUni = 0, missingCountry = 0, dataRows = 0;
const requiredEmpty = [];
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => c == null || c === '')) continue;
    dataRows++;
    if (r[I.Date] == null || r[I.Date] === '') { missingDate++; requiredEmpty.push(`row ${i + 1}: no Date`); }
    if (String(r[I.University] ?? '').trim() === '') { missingUni++; requiredEmpty.push(`row ${i + 1}: no University`); }
    if (String(r[I.Country] ?? '').trim() === '') { missingCountry++; requiredEmpty.push(`row ${i + 1}: no Country`); }
}
console.log('\n[3] REQUIRED FIELDS');
console.log(`  data rows: ${dataRows}`);
console.log(`  missing Date: ${missingDate}, missing University: ${missingUni}, missing Country: ${missingCountry}`);
if (requiredEmpty.length) console.log('  ' + requiredEmpty.slice(0, 10).join('\n  '));

// 4. Duplicate groups (uni+country+date)
const norm = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const groups = new Map();
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => c == null || c === '')) continue;
    const k = [norm(r[I.Country]), norm(r[I.University]), String(r[I.Date] ?? '')].join('|');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
}
const dupGroups = [...groups.entries()].filter(([, v]) => v.length > 1);
console.log('\n[4] DUPLICATE GROUPS (uni+country+date)');
console.log(dupGroups.length === 0 ? '  none OK' : `  ${dupGroups.length} groups with >1 row:`);
for (const [k, idxs] of dupGroups) {
    const [c, u] = k.split('|');
    console.log(`  "${u.slice(0, 50)}" (${c}) x${idxs.length} -> rows ${idxs.map(i => '#' + (i + 1)).join(', ')}`);
}

// 5. Field coverage + spot checks
const cov = (col) => rows.slice(1).filter(r => r && String(r[col] ?? '').trim() !== '').length;
console.log('\n[5] FIELD COVERAGE (non-empty cells)');
for (const [e, ci] of Object.entries(I)) console.log(`  ${e.padEnd(16)}: ${cov(ci)}`);
const serialToDate = (s) => {
    if (typeof s !== 'number') return String(s ?? '');
    const p = XLSX.SSF.parse_date_code(s);
    return p ? `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}` : String(s);
};
console.log('\n[6] SPOT CHECKS (row 2 = Illinois Tech, row 10/11 = Vermont, first Block 3 row)');
for (const ri of [1, 9, 10, 95]) {
    const r = rows[ri];
    if (!r) continue;
    console.log(`  row ${ri + 1}: ${serialToDate(r[I['Date']])} | ${r[I['Country']]} | ${String(r[I['University']]).slice(0, 45)} | completed ${serialToDate(r[I['Completed Date']])} | ${r[I['MoU Status']]}`);
}
