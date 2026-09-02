// analyze_campus.mjs — read-only quality/analysis pass over FResh Campus visits.xlsx.
// Goals:
//  1. distinct values of the Type column + counts (find campus visit / seminar /
//     guest lecture / consultant visit / masters desk vocab)
//  2. date-cell coverage + format sample (text dd/m/yy vs serial)
//  3. blank counts per column
//  4. sample a few rows per Type value so we can see differing shapes
import XLSX from 'xlsx';

const file = 'C:\\Users\\saish\\Downloads\\FResh Campus visits.xlsx';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

const header = rows[0];
console.log('HEADER:', header);
const data = rows.slice(1);

const countBy = (fn) => {
    const m = new Map();
    for (const r of data) {
        const k = fn(r);
        const key = k === null || k === undefined || k === '' ? '(blank)' : String(k);
        m.set(key, (m.get(key) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const col = (i) => (r) => r[i] ?? null;

console.log('\n--- Type (col 1) distribution ---');
for (const [v, n] of countBy(col(1))) console.log(`${n}\t"${v}"`);

console.log('\n--- Department (col 6) distribution (top 40) ---');
for (const [v, n] of countBy(col(6)).slice(0, 40)) console.log(`${n}\t"${v}"`);

console.log('\n--- Campus (col 7) distribution ---');
for (const [v, n] of countBy(col(7))) console.log(`${n}\t"${v}"`);

console.log('\n--- Blank counts per column ---');
for (let i = 0; i < header.length; i++) {
    let blank = 0;
    for (const r of data) {
        const v = r[i];
        if (v === null || v === undefined || String(v).trim() === '') blank++;
    }
    console.log(`col ${i} "${header[i]}": ${blank} blank / ${data.length}`);
}

console.log('\n--- Date (col 0) format census ---');
let textDates = 0, serialDates = 0, isoDates = 0, other = 0, blanks = 0;
const textSamples = [], serialSamples = [], otherSamples = [];
for (const r of data) {
    const v = r[0];
    if (v === null || v === undefined || String(v).trim() === '') { blanks++; continue; }
    if (typeof v === 'number') { serialDates++; if (serialSamples.length < 6) serialSamples.push(String(v)); continue; }
    const s = String(v).trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{2}( |$)/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}( |$)/.test(s)) { textDates++; if (textSamples.length < 6) textSamples.push(s); continue; }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) { isoDates++; continue; }
    other++; if (otherSamples.length < 10) otherSamples.push(s);
}
console.log(`text dd/m/yy or dd/mm/yyyy: ${textDates}`);
console.log(`  samples: ${JSON.stringify(textSamples)}`);
console.log(`numeric serial: ${serialDates}  samples: ${JSON.stringify(serialSamples)}`);
console.log(`ISO yyyy-mm-dd: ${isoDates}`);
console.log(`other/unparseable: ${other}  samples: ${JSON.stringify(otherSamples)}`);
console.log(`blank: ${blanks}`);

console.log('\n--- Duplicate detection: whole-row fingerprint counts ---');
const seen = new Map();
for (const r of data) {
    const fp = JSON.stringify(r.map((c) => (c === null ? '' : String(c)).trim()));
    seen.set(fp, (seen.get(fp) || 0) + 1);
}
const dupes = [...seen.entries()].filter(([, n]) => n > 1);
console.log(`unique rows: ${seen.size}, duplicate fingerprints: ${dupes.length}`);
for (const [fp, n] of dupes.slice(0, 10)) console.log(`  x${n}: ${fp.slice(0, 160)}`);
