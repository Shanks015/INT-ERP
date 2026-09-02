// analyze_campus2.mjs — read-only. Inspect ambiguous rows and Type-vs-Summary coherence.
import XLSX from 'xlsx';

const file = 'C:\\Users\\saish\\Downloads\\FResh Campus visits.xlsx';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const header = rows[0];
const data = rows.slice(1);

// Confirm real rows = those with any content in cols 0-7
const real = data.filter((r) => r.slice(0, 8).some((c) => c !== null && c !== undefined && String(c).trim() !== ''));
console.log(`real data rows (content in cols A-H): ${real.length}`);

// Any content beyond real rows (below) — find last non-empty row across sheet
let maxRow = -1;
const ref = ws['!ref']; // e.g. A1:I1559
const lastRowNum = parseInt(ref.split(':')[1].replace(/[A-Z]/g, ''), 10);
// scan rows beyond 116 for any non-empty
let orphanLinks = 0, otherContent = 0;
for (let i = 115; i < lastRowNum; i++) {
    const r = rows[i] || [];
    const a = r.slice(0, 8).some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    const link = r[8] !== null && r[8] !== undefined && String(r[8]).trim() !== '';
    if (a) otherContent++;
    else if (link) orphanLinks++;
}
console.log(`rows beyond 115 with A-H content: ${otherContent}; orphan drive links only: ${orphanLinks}; sheet last row: ${lastRowNum}`);

const show = (label, pred) => {
    console.log(`\n===== ${label} =====`);
    real.forEach((r, idx) => {
        if (!pred(r)) return;
        const cells = r.map((c) => (c === null ? '' : String(c).trim().replace(/\s+/g, ' ')));
        console.log(`#${idx + 2}: date=${cells[0]} | type=${cells[1]}\n  visitor=${cells[2].slice(0, 140)}\n  country=${cells[3]} | univ=${cells[4].slice(0, 100)}\n  summary=${cells[5].slice(0, 200)}\n  dept=${cells[6]} | campus=${cells[7]}\n  link=${cells[8].slice(0, 90)}`);
    });
};

const T = (r) => String(r[1] ?? '').trim();

// The 3 ambiguous leftover types
show('Type = "Other"', (r) => T(r) === 'Other');
show('Type = "Corporate Collaboration"', (r) => T(r) === 'Corporate Collaboration');
show('Type = "Consultant Visit"', (r) => T(r) === 'Consultant Visit');
show('Type = "Seminar"', (r) => T(r) === 'Seminar');

// Cross-check: does the word "seminar" or "guest lecture" appear in Summary/Visitor
// of rows typed "University Visit", and does "consult" / "masters" appear anywhere?
const has = (r, re) => re.test(String(r[5] ?? '') + ' ' + String(r[2] ?? '') + ' ' + String(r[4] ?? '') + ' ' + T(r));
console.log('\n===== keyword cross-checks =====');
const kw = (label, re) => {
    const hits = real.filter((r) => has(r, re));
    console.log(`"${label}" in summary/visitor/univ/type -> ${hits.length} rows`);
    for (const r of hits) {
        const cells = r.map((c) => (c === null ? '' : String(c).trim().replace(/\s+/g, ' ')));
        console.log(`  # ? type=${cells[1]} | ${cells[5].slice(0, 160)}`);
    }
};
kw('seminar', /\bseminar\b/i);
kw('guest lecture', /\bguest\s*lecture\b/i);
kw('consultant', /consultant|consulting|masters\s*desk|masters\b/i);
kw('campus visit', /\bcampus\s*visit\b/i);
kw('lecture', /\blecture\b/i);
