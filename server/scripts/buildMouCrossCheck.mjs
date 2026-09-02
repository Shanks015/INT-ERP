// buildMouCrossCheck.mjs — compare the fresh folder extraction
// (mou-extracted.xlsx) against the existing MoU Update tracker
// (Proper-cleaned.xlsx / "MoU Update"). Data-first: no ERP-schema forcing.
//
// Output: C:/Users/saish/Downloads/mou-extract-vs-tracker.xlsx
//   "Not in Tracker"  — extraction records with no match in the tracker
//   "In Tracker Only" — tracker rows with no match in the extraction
//   "Matched"         — aligned pairs, date/status compared, mismatches flagged
import XLSX from 'xlsx';

const EXTRACT = 'C:/Users/saish/Downloads/mou-extracted.xlsx';
const TRACKER = 'C:/Users/saish/Downloads/Proper-cleaned.xlsx';
const OUT = 'C:/Users/saish/Downloads/mou-extract-vs-tracker.xlsx';

const str = (v) => String(v ?? '').trim();
const clean = (s) => str(s).replace(/\s+/g, ' ');
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// --- name normalization -------------------------------------------------------
function normName(s) {
    let t = clean(s).toLowerCase();
    // drop parentheticals (campus/owner detail), keep the core name
    t = t.replace(/\([^)]*\)/g, ' ');
    t = t.replace(/\b(university|universidad|universitat|universita|universitet)\b/g, ' ');
    t = t.replace(/^(the|and|de|of|van|el)\s+/g, ' ');
    t = t.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    // stem a few common suffixes so "Technology"/"Technological", "Business"/"busi" align
    t = t.replace(/technolog(ical|y|ic)?$/, 'tech');
    t = t.replace(/business$/, 'busi');
    t = t.replace(/universi?t(ies|y)?$/, 'uni');
    t = t.replace(/institute?$/, 'inst');
    t = t.replace(/college$/, 'coll');
    return t;
}
const tokens = (s) => normName(s).split(' ').filter(w => w.length > 2);
const jaccard = (a, b) => {
    const A = new Set(tokens(a)), B = new Set(tokens(b));
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    return inter / (A.size + B.size - inter);
};

// --- read sources ---------------------------------------------------------------
const ex = XLSX.utils.sheet_to_json(XLSX.readFile(EXTRACT).Sheets['MoU Extraction'], { header: 1, defval: null });
const H = Object.fromEntries(ex[0].map((x, i) => [x, i]));
const extr = ex.slice(1).filter(r => r.some(c => c != null && c !== '')).map(r => ({
    date: r[H['Date']], country: r[H['Country']], university: clean(r[H['University']]),
    status: clean(r[H['MoU Status']]), type: clean(r[H['Agreement Type']]),
    term: clean(r[H['Term']]), year: r[H['Year']], remarks: clean(r[H['Remarks']]),
}));

const tr = XLSX.utils.sheet_to_json(XLSX.readFile(TRACKER).Sheets['MoU Update'], { header: 1, defval: null });
const TH = Object.fromEntries(tr[0].map((x, i) => [x, i]));
const track = tr.slice(1).filter(r => r.some(c => c != null && c !== '')).map(r => ({
    date: r[TH['Date']], country: r[TH['Country']], university: clean(r[TH['University']]),
    completed: r[TH['Completed Date']], status: clean(r[TH['MoU Status']]),
    type: clean(r[TH['Agreement Type']]), term: clean(r[TH['Term']]),
    validity: clean(r[TH['Validity Status']]), link: clean(r[TH['Drive Link']]),
}));

// --- match ----------------------------------------------------------------------
const fmtSerial = (v) => {
    if (v == null || v === '') return '';
    if (typeof v === 'number') {
        const q = XLSX.SSF.parse_date_code(v);
        if (!q || q.y < 2000) return '';
        return `${String(q.d).padStart(2, '0')}-${MONTH_ABBR[q.m - 1]}-${q.y}`;
    }
    return String(v);
};

const used = new Map();          // tracker index -> number of extract records matched
const matched = [];          // {ex, tr, dateEq, dateNote, statusNote, nAgreements}
const notInTracker = [];
const probable = [];         // weak but plausible match — human verify
const inTrackerOnly = [];

for (const e of extr) {
    let best = null, bestScore = 0;
    for (let i = 0; i < track.length; i++) {
        const sc = jaccard(e.university, track[i].university);
        if (sc > bestScore) { bestScore = sc; best = i; }
    }
    if (best != null && bestScore >= 0.35) {
        const t = track[best];
        used.set(best, (used.get(best) || 0) + 1);
        const dEq = (e.date == null || e.date === '') ? '' : (fmtSerial(e.date) === fmtSerial(t.date));
        const dateNote = dEq === false ? `Extract ${fmtSerial(e.date)} vs Tracker ${fmtSerial(t.date)}` : '';
        const statusNote = (e.status && t.status && e.status.toLowerCase() !== t.status.toLowerCase())
            ? `Status: extract "${e.status}" vs tracker "${t.status}"` : '';
        matched.push({ e, t, dEq, dateNote, statusNote, nAgreements: used.get(best) });
    } else if (best != null && bestScore >= 0.18) {
        probable.push({ e, t: track[best], score: Math.round(bestScore * 100) });
    } else {
        notInTracker.push(e);
    }
}
for (let i = 0; i < track.length; i++) if (!used.has(i)) inTrackerOnly.push(track[i]);

// --- write ----------------------------------------------------------------------
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'University', 'Country', 'Year', 'Date', 'Agreement Type', 'MoU Status', 'Term', 'Remarks'],
    ...notInTracker.map((r, i) => [i + 1, r.university, r.country, r.year, fmtSerial(r.date), r.type, r.status, r.term, r.remarks])
]), 'Not in Tracker');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'University', 'Country', 'Date', 'Completed Date', 'MoU Status', 'Agreement Type', 'Term', 'Validity Status', 'Drive Link'],
    ...inTrackerOnly.map((r, i) => [i + 1, r.university, r.country, fmtSerial(r.date), fmtSerial(r.completed), r.status, r.type, r.term, r.validity, r.link])
]), 'In Tracker Only');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'University', 'Extract Date', 'Tracker Date', 'Date Match', 'Date Note', 'Status Note', 'Agreements'],
    ...matched.map((m, i) => [i + 1, m.e.university, fmtSerial(m.e.date), fmtSerial(m.t.date), m.dEq === '' ? '(extract has no date)' : (m.dEq ? 'YES' : 'DIFFERS'), m.dateNote, m.statusNote, m.nAgreements])
]), 'Matched');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'University', 'Best tracker match', 'Match %', 'Extract Date', 'Tracker Date'],
    ...probable.map((m, i) => [i + 1, m.e.university, m.t.university, m.score, fmtSerial(m.e.date), fmtSerial(m.t.date)])
]), 'Probable Match');
XLSX.writeFile(wb, OUT, { cellStyles: true });

// --- report ----------------------------------------------------------------------
console.log('WROTE:', OUT);
console.log('==================================================');
console.log('extraction records :', extr.length);
console.log('tracker rows       :', track.length);
console.log('matched            :', matched.length);
console.log('probable match     :', probable.length);
console.log('not in tracker     :', notInTracker.length);
console.log('in tracker only    :', inTrackerOnly.length);
console.log();
console.log('PROBABLE MATCH (verify):');
for (const m of probable) console.log(`  ${m.e.university.slice(0, 46)} ~ ${m.t.university.slice(0, 30)} (${m.score}%)`);
console.log();
console.log('DATE MISMATCHES (matched pairs):');
for (const m of matched) if (m.dateNote) console.log(`  ${m.e.university.slice(0, 44)} | ${m.dateNote}`);
console.log();
console.log('STATUS NOTES (matched pairs):');
for (const m of matched) if (m.statusNote) console.log(`  ${m.e.university.slice(0, 44)} | ${m.statusNote}`);
console.log();
console.log('NOT IN TRACKER (new in extraction):');
for (const r of notInTracker) console.log(`  [${r.year}] ${r.university.slice(0, 52)} (${r.status})`);
