// Deep inspection of the "MoU Update" sheet in Proper .xlsx (and row counts
// for all sheets). Same analysis as before: header location, repeated headers,
// spacer rows, per-column type mix, text-date fingerprints, numeric ranges.
// Read-only.
import XLSX from 'xlsx';

const FILE = 'C:/Users/saish/Downloads/Proper .xlsx';
const wb = XLSX.readFile(FILE, { cellStyles: true, sheetStubs: true });

console.log('SHEETS + row counts:');
for (const n of wb.SheetNames) {
    const r = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null });
    console.log(`  ${n}: ${r.length - 1} data rows, max cols ${r.length ? Math.max(...r.map(x => x.length)) : 0}`);
}

const sheetName = 'MoU Update';
const ws = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
console.log(`\nINSPECTING: ${sheetName} | total rows: ${rows.length}`);

// --- first 12 rows raw ---
console.log('\n--- first 12 rows ---');
rows.slice(0, 12).forEach((r, i) => {
    const cells = r.map(c => (c == null ? '·' : JSON.stringify(c).slice(0, 24))).join(' | ');
    console.log(`r${i + 1}: ${cells.slice(0, 400)}`);
});

// --- header-like rows anywhere ---
console.log('\n--- header-like rows anywhere ---');
const headerWords = /university|country|date|status|contact|agreement|term|validity|email|department/i;
rows.forEach((r, i) => {
    const strings = r.filter(c => typeof c === 'string' && c.trim() !== '');
    if (strings.length >= 4 && strings.filter(c => headerWords.test(c)).length >= 3) {
        console.log(`r${i + 1}: ${strings.map(s => s.slice(0, 30)).join(' | ').slice(0, 500)}`);
    }
});

// --- spacer rows ---
const empties = [];
rows.forEach((r, i) => { if (r.every(c => c == null || c === '')) empties.push(i + 1); });
console.log('\nall-empty row numbers:', empties.join(',') || '(none)');

// --- per-column type mix + text-date shapes ---
const headers = (rows[0] || []).map(h => (h == null ? '' : String(h).trim()));
const width = Math.max(...rows.map(r => r.length));
console.log('\n--- column analysis (row 1 as header) ---');
for (let c = 0; c < width; c++) {
    const tally = { number: 0, date: 0, text: 0, empty: 0 };
    const dateShapes = {};
    const numbers = new Set();
    const textSamples = [];
    for (let r = 1; r < rows.length; r++) {
        const v = rows[r] ? rows[r][c] : null;
        if (v == null || v === '') { tally.empty++; continue; }
        if (v instanceof Date) { tally.date++; continue; }
        if (typeof v === 'number') { tally.number++; if (numbers.size < 6) numbers.add(v); continue; }
        const s = String(v).trim();
        if (/^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(s)) {
            tally.date++;
            const shape = s.replace(/\d/g, 'N');
            if (!dateShapes[shape]) dateShapes[shape] = [];
            if (dateShapes[shape].length < 5) dateShapes[shape].push(s);
        } else {
            tally.text++;
            if (textSamples.length < 4) textSamples.push(s.slice(0, 20));
        }
    }
    if (tally.number + tally.date + tally.text + tally.empty === 0) continue;
    const shapes = Object.entries(dateShapes).map(([sh, ex]) => `${sh} e.g. ${ex.join(' / ')}`).join(' ; ');
    console.log(`col${c} [${(headers[c] || '(no header)').slice(0, 32)}]: n=${tally.number} date=${tally.date} text=${tally.text} empty=${tally.empty}`
        + (numbers.size ? ` | numbers: ${[...numbers].join(',')}` : '')
        + (textSamples.length ? ` | texts: ${textSamples.join(' / ')}` : '')
        + (shapes ? `\n      text-dates: ${shapes}` : ''));
}

// --- numeric ranges ---
console.log('\n--- numeric ranges (serials ~44000-46500) ---');
for (let c = 0; c < width; c++) {
    const vals = rows.slice(1).map(r => (r && typeof r[c] === 'number' ? r[c] : null)).filter(v => v != null);
    if (vals.length) console.log(`col${c}: min=${Math.min(...vals)} max=${Math.max(...vals)} count=${vals.length}`);
}

// --- duplicate check by (university + contact email) ---
const norm = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9@.]+/g, ' ').trim();
const uniCol = headers.findIndex(h => /university/i.test(h));
const mailCol = headers.findIndex(h => /email/i.test(h));
if (uniCol >= 0) {
    const seen = {};
    rows.slice(1).forEach((r, i) => {
        const k = norm(r[uniCol]) + (mailCol >= 0 ? '|' + norm(r[mailCol]) : '');
        if (!k.trim()) return;
        (seen[k] = seen[k] || []).push(i + 2);
    });
    const dups = Object.entries(seen).filter(([, v]) => v.length > 1);
    console.log(`\nduplicate groups by University${mailCol >= 0 ? '+Email' : ''}: ${dups.length}`);
    dups.forEach(([k, v]) => console.log(`  ${k.slice(0, 50)} -> rows ${v.join(', ')}`));
}
