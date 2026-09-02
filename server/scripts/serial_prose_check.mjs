// serial_prose_check.mjs — read-only. For every serial-dated row, print the formula-decoded
// date (the convention the project import uses = Excel display) alongside any date phrase in the
// summary prose, so a human can confirm they agree before we bake dates into cleaned workbooks.
import XLSX from 'xlsx';

const file = 'C:/Users/saish/Downloads/FResh Campus visits.xlsx';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

const parseDate = (v) => {
    if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400 * 1000));
    return null;
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (d) => (d ? `${String(d.getDate()).padStart(2, '0')}/${MONTHS[d.getMonth()]}/${d.getFullYear()}` : '');

// crude date-phrase finder in prose: "5th February 2026", "2nd April to 8th April", "31st January to ..."
const phrase = (s) => {
    const m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Z][a-z]{2,8})\s+(\d{4})/);
    if (!m) return s.slice(0, 70);
    return `${m[1]} ${m[2]} ${m[3]}`;
};

let count = 0;
for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const v = r[0];
    if (typeof v === 'number') {
        count++;
        const d = parseDate(v);
        const type = String(r[1] ?? '').trim();
        const visitor = String(r[2] ?? '').trim().slice(0, 45);
        const summary = String(r[5] ?? '').replace(/\s+/g, ' ').trim();
        console.log(`ROW ${i + 1}: decoded=${fmt(d)} (serial=${v}) type=${type}\n   visitor=${visitor}\n   prose-date?="${phrase(summary).slice(0, 80)}"\n   summary="${summary.slice(0, 300)}"`);
        console.log('');
    }
}
console.log(`Total serial-dated rows: ${count}`);
