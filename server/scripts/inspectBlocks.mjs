// Segment the MoU Update sheet into paste-blocks (delimited by the header-like
// rows and empty spacer rows) and dump each block's header + full sample rows
// across all 15 columns, so each block's column mapping is unambiguous.
// Read-only.
import XLSX from 'xlsx';

const FILE = 'C:/Users/saish/Downloads/Proper .xlsx';
const wb = XLSX.readFile(FILE, { sheetStubs: true });
const ws = wb.Sheets['MoU Update'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

// A row is a header row if it has >=4 short strings, several matching domain words.
const headerWords = /university|country|date|status|contact|agreement|term|validity|email|department|school|remark|record|link|sl no/i;
const isHeaderRow = (r) => {
    const strings = r.filter(c => typeof c === 'string' && c.trim() !== '');
    return strings.length >= 4 && strings.filter(c => headerWords.test(c)).length >= 3;
};
const isEmpty = (r) => r.every(c => c == null || c === '');

// Find block starts: header rows, or first non-empty row after an empty gap.
const blocks = [];
let current = null;
for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (isHeaderRow(r)) {
        current = { start: i, headerRow: i + 1 };
        blocks.push(current);
        continue;
    }
    if (isEmpty(r)) { current = null; continue; }
    if (!current) {
        current = { start: i, headerRow: null };
        blocks.push(current);
    }
}
// Block ends: next block start - 1 (or sheet end).
blocks.forEach((b, i) => { b.end = (i + 1 < blocks.length ? blocks[i + 1].start : rows.length) - 1; });

const serialToDate = (s) => {
    if (typeof s !== 'number' || s < 40000 || s > 50000) return null;
    const p = XLSX.SSF.parse_date_code(s);
    return p ? `${String(p.d).padStart(2, '0')}/${String(p.m).padStart(2, '0')}/${p.y}` : null;
};
const show = (v) => {
    if (v == null || v === '') return '·';
    const d = serialToDate(v);
    if (d) return `${v}→${d}`;
    return JSON.stringify(v).slice(0, 60);
};

blocks.forEach((b, i) => {
    const header = rows[b.start];
    console.log(`\n========== BLOCK ${i + 1}: sheet rows ${b.start + 1}-${b.end + 1} (${b.end - b.start} rows) ==========`);
    console.log('HEADER:', (header || []).map(show).join(' | '));
    const samples = [b.start + 1, b.start + 2, Math.floor((b.start + b.end) / 2), b.end]
        .filter((v, idx, arr) => arr.indexOf(v) === idx && v > b.start && v <= b.end);
    for (const ri of samples) {
        console.log(`r${ri + 1}: ${rows[ri].map(show).join(' | ').slice(0, 700)}`);
    }
});
