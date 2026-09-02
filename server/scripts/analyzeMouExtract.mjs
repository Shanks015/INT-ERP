// analyzeMouExtract.mjs — QA the mou-extracted.xlsx output before handing it over.
import XLSX from 'xlsx';

const F = 'C:/Users/saish/Downloads/mou-extracted.xlsx';
const wb = XLSX.readFile(F);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['MoU Extraction'], { header: 1, defval: null });
const hdr = rows[0];
const idx = Object.fromEntries(hdr.map((h, i) => [h, i]));
const data = rows.slice(1).filter(r => r.some(c => c != null && c !== ''));

console.log('TOTAL DATA ROWS :', data.length);
console.log('HEADERS         :', hdr.join(' | '));
console.log();

// --- by year folder -----------------------------------------------------------
const byYear = {};
for (const r of data) { const y = r[idx['Year Folder']] || '?'; byYear[y] = (byYear[y] || 0) + 1; }
console.log('BY YEAR:');
for (const [y, n] of Object.entries(byYear).sort((a, b) => a[0].localeCompare(b[0]))) console.log(`  ${y}: ${n}`);

// --- status breakdown -----------------------------------------------------------
const byStatus = {};
for (const r of data) { const s = String(r[idx['MoU Status']] || '(blank)'); byStatus[s] = (byStatus[s] || 0) + 1; }
console.log('\nBY STATUS:');
for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) console.log(`  ${s}: ${n}`);

// --- agreement type breakdown ---------------------------------------------------
const byType = {};
for (const r of data) { const s = String(r[idx['Agreement Type']] || '(blank)'); byType[s] = (byType[s] || 0) + 1; }
console.log('\nBY AGREEMENT TYPE:');
for (const [s, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${s}: ${n}`);

// --- duplicates: same normalized university name in multiple records --------------
const seen = new Map();
for (const r of data) {
    const u = String(r[idx['University']] || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!u) continue;
    if (!seen.has(u)) seen.set(u, []);
    seen.get(u).push(r);
}
console.log('\nDUPLICATE UNIVERSITY NAME GROUPS (same name >1 record):');
let nDup = 0;
for (const [u, recs] of seen) {
    if (recs.length > 1) {
        nDup++;
        const yrs = recs.map(r => r[idx['Year Folder']]).join(',');
        const types = recs.map(r => String(r[idx['Agreement Type']] || '?')).join(' / ');
        console.log(`  [${yrs}] ${u.slice(0, 50)}  (${types})`);
    }
}
console.log('  groups:', nDup);

// --- date column type sanity ------------------------------------------------------
let nSerial = 0, nText = 0;
for (const r of data) { const c = r[idx['Date']]; if (typeof c === 'number') nSerial++; else if (c) nText++; }
console.log(`\nDATE CELLS: serial=${nSerial}, text(year-only or string)=${nText}, blank=${data.length - nSerial - nText}`);

// --- sample: first 6 rows ---------------------------------------------------------
console.log('\nSAMPLE ROWS (first 6):');
for (const r of data.slice(0, 6)) {
    console.log(`  ${r[idx['Year Folder']]} | ${r[idx['Date']]} | ${String(r[idx['University']]).slice(0, 40)} | ${r[idx['MoU Status']]} | ${String(r[idx['Country']]).slice(0, 14)} | ${String(r[idx['Term']] || '').slice(0, 12)}`);
}

// --- full missing-field list from the audit sheet ---------------------------------
const miss = XLSX.utils.sheet_to_json(wb.Sheets['Missing Fields'], { header: 1, defval: null }).slice(1)
    .filter(r => r.some(c => c != null && c !== ''));
const byMiss = {};
for (const r of miss) { const m = r[2] || '?'; byMiss[m] = (byMiss[m] || 0) + 1; }
console.log('\nMISSING-FIELD AUDIT COUNT:', miss.length, JSON.stringify(byMiss));
