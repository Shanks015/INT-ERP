// dump_special.mjs — read-only. Dump full rows for the reclassify-4 (rows 2,68,114,115),
// the 3 Other/scholar rows and the Corporate Collaboration row, to lock cleaning rules.
import XLSX from 'xlsx';

const file = 'C:/Users/saish/Downloads/FResh Campus visits.xlsx';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

const show = (n) => {
    const r = rows[n - 1];
    if (!r) return;
    const c = (i) => (r[i] === null || r[i] === undefined ? '' : String(r[i]).trim().replace(/\s+/g, ' '));
    console.log(`ROW ${n}:\n  date="${c(0)}" type="${c(1)}"\n  visitor="${c(2)}"\n  country="${c(3)}"\n  univ="${c(4)}"\n  summary="${c(5).slice(0, 420)}"\n  dept="${c(6)}" campus="${c(7)}"\n  link="${c(8).slice(0, 150)}"`);
    console.log('');
};

console.log('===== Reclassify candidates (University Visit but lecture/session) =====');
[2, 68, 114, 115].forEach(show);

console.log('===== Other + Corporate Collaboration rows =====');
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const t = String(r[1] ?? '').trim();
    if (t === 'Other' || t === 'Corporate Collaboration') show(i + 1);
}
