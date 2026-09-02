// validate_campus_dates.mjs — read-only. Lock date-decoding rules before baking the cleaner.
// 1. All 114 real rows: classify date cell (serial | text), compute canonical dd/MMM/yyyy.
// 2. Flag ambiguous text dates (dd<=12 and mm<=12) — dd/mm intent assumed, but listed for the report.
// 3. Blank required cells (date/visitor/country/univ) and duplicate fingerprints.
import XLSX from 'xlsx';

const file = 'C:/Users/saish/Downloads/FResh Campus visits.xlsx';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d) => (d ? `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}` : '');

const serialDate = (v) => new Date(Math.round((v - 25569) * 86400 * 1000));

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

// real rows 2..115 (contiguous 114)
const realRows = [];
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (r.slice(0, 8).some((c) => c !== null && c !== undefined && String(c).trim() !== '')) realRows.push({ rowNo: i + 1, r });
}
console.log(`Real rows detected: ${realRows.length} (expected 114)`);

const kind = (rowNo) => {
    // 6 prose-override rows
    const overrides = { 98: '09/Dec/2025', 102: '05/Feb/2026', 107: '06/Mar/2026', 108: '09/Apr/2026', 109: '02/Apr/2026', 110: '02/Apr/2026' };
    return overrides[rowNo];
};

let serialCount = 0, textCount = 0, ambiguousText = [], blanks = [], dupeSeen = new Set(), dupes = [];

for (const { rowNo, r } of realRows) {
    const v = r[0];
    const dateStr = kind(rowNo);
    let src = 'override';
    if (!dateStr) {
        if (typeof v === 'number') { serialCount++; src = 'serial'; }
        else { textCount++; src = 'text'; }
    }
    // canonical decode (day-first) for report/compare
    let decoded = null, ambig = false;
    if (typeof v === 'number') decoded = serialDate(v);
    else if (typeof v === 'string' && /^[\d/]+$/.test(v.trim())) {
        decoded = textDate(v);
        const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\//);
        if (m && +m[1] <= 12 && +m[2] <= 12) ambig = true;
    }
    const finalStr = dateStr || (decoded ? fmt(decoded) : String(v ?? ''));
    if (ambig) ambiguousText.push({ rowNo, raw: v, canonical: finalStr, visitor: String(r[2] ?? '').slice(0, 40) });

    // blanks in required (date, visitor, country, university) + type/other col sanity
    const blankCols = [];
    if (!finalStr || finalStr === 'null' || String(v ?? '').trim() === '') blankCols.push('Date');
    if (!String(r[2] ?? '').trim()) blankCols.push('Visitor');
    if (!String(r[3] ?? '').trim()) blankCols.push('Country');
    if (!String(r[4] ?? '').trim()) blankCols.push('University');
    if (blankCols.length) blanks.push({ rowNo, cols: blankCols, visitor: String(r[2] ?? '').slice(0, 40) });

    // duplicate fingerprint on date+normalized visitor
    const normV = String(r[2] ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fp = `${finalStr}|${normV}`;
    if (dupeSeen.has(fp)) dupes.push({ rowNo, fp, visitor: String(r[2] ?? '').slice(0, 40) });
    dupeSeen.add(fp);
}

console.log(`Serial rows: ${serialCount}, text rows: ${textCount} (sum ${serialCount + textCount}; +6 overrides = 114 ${serialCount + textCount + 6 === 114 ? 'OK' : 'MISMATCH'})`);
console.log(`\nAmbiguous text dates (dd<=12 & mm<=12, read day-first): ${ambiguousText.length}`);
ambiguousText.forEach((a) => console.log(`  row${a.rowNo} raw="${a.raw}" -> ${a.canonical} | ${a.visitor}`));
console.log(`\nRows with blank required cells: ${blanks.length}`);
blanks.forEach((b) => console.log(`  row${b.rowNo} missing [${b.cols.join(', ')}] | ${b.visitor}`));
console.log(`\nDuplicate date+visitor fingerprints: ${dupes.length}`);
dupes.forEach((d) => console.log(`  row${d.rowNo} fp=${d.fp} | ${d.visitor}`));

console.log('\n--- All serial rows with final canonical date ---');
for (const { rowNo, r } of realRows) {
    const v = r[0];
    const over = kind(rowNo);
    if (typeof v === 'number' || over) {
        let d = over ? textDate(over.replace(/\//g, '/')) : null;
        if (!d && over) { const m = over.split('/'); d = new Date(Date.UTC(+m[2], +['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]), +m[0])); }
        const final = over || (typeof v === 'number' ? fmt(serialDate(v)) : '');
        console.log(`row${rowNo}: serial=${typeof v === 'number' ? v : 'override'} -> ${final}  type=${String(r[1] ?? '').trim().slice(0, 30)}  visitor=${String(r[2] ?? '').slice(0, 45)}`);
    }
}
