// buildMouVsOriginal.mjs — compare the workbook we prepared (mou-extracted.xlsx,
// 210 records from the disk folders) against the ORIGINAL tracker
// (Copy of MoU & SE Original File.xlsx: per-year sheets + Student Exchange).
//
// Output: C:/Users/saish/Downloads/mou-extracted-vs-original.xlsx
//   Summary · Matched · In Ours Only · In Original Only · Probable Match
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const OURS = 'C:/Users/saish/Downloads/mou-extracted.xlsx';
const ORIG = 'C:/Users/saish/Downloads/Copy of MoU & SE Original File.xlsx';
const OUT  = 'C:/Users/saish/Downloads/mou-extracted-vs-original.xlsx';

const str = (v) => String(v ?? '').trim();
const normUni = (s) => str(s).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
// loose: drop leading "the"/"university of" + trailing ", university" noise for fuzzy pass
const looseUni = (s) => normUni(s).replace(/^(the |university of )/g, '').replace(/( university| university of)$/g, '').trim();

// Excel serial -> YYYY-MM-DD (1900 system, works for serials >= 61)
const serialDate = (serial) => {
    if (!(typeof serial === 'number') || !isFinite(serial) || serial < 20000) return '';
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
// text dates the tracker stores as strings: DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
const parseTextDate = (s) => {
    const m = str(s).match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (!m) return '';
    const [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 2000 || y > 2040) return '';
    let d, mo;
    if (a <= 31 && b <= 12) { d = a; mo = b; }
    else if (a <= 12 && b <= 31) { d = b; mo = a; }
    else return '';
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return '';
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// ---------- 1. OUR workbook ----------
const ourWb = XLSX.readFile(OURS);
const ourRows = XLSX.utils.sheet_to_json(ourWb.Sheets[ourWb.SheetNames[0]], { defval: '', raw: true });
const ours = ourRows.map(r => ({
    university: str(r.University),
    norm: normUni(r.University),
    country: str(r.Country),
    year: str(r.Year),
    date: typeof r.Date === 'number' ? serialDate(r.Date) : str(r.Date),   // year-only stays text
    status: str(r['MoU Status']),
    type: str(r['Agreement Type']),
    term: str(r.Term),
    validity: str(r['Validity Status']),
    source: str(r['Source Files']).split(',')[0],
}));

// ---------- 2. ORIGINAL tracker ----------
const sheetCol = (hdrRow, rx) => {
    for (let i = 0; i < hdrRow.length; i++) if (rx.test(str(hdrRow[i]))) return i;
    return -1;
};
const orig = [];   // {university,norm,country,year,date,completedOn,status,type,term,validity,remarks,contact,email,link,sheet}
// sheet names in the file carry odd spacing — resolve by fuzzy match
const sheetByName = (want) => Object.keys(origWb.Sheets).find(sn => normUni(sn).replace(/\s+/g, '').includes(want)) || null;
const origSheets = ['2026', '2025', '2024', '2023', '2011', 'studentexchange'];
const origWb = XLSX.readFile(ORIG);
for (const want of origSheets) {
    const sn = sheetByName(want);
    if (!sn) { console.log('missing sheet', want); continue; }
    const ws = origWb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });
    const h = rows[0];
    const C = {
        university: sheetCol(h, /^univers/i), country: sheetCol(h, /^countr/i), date: sheetCol(h, /^date$/i),
        completed: sheetCol(h, /completed on/i), status: sheetCol(h, /^status$/i), type: sheetCol(h, /agreement/i),
        term: sheetCol(h, /term/i), validity: sheetCol(h, /mou status|moustatus|^status.*mou/i),
        link: sheetCol(h, /doc link|^link$/i), person: sheetCol(h, /contact person/i), email: sheetCol(h, /contact email|contaact email/i),
        remarks: sheetCol(h, /remarks/i),
    };
    for (const r of rows.slice(1)) {
        const uni = str(r[C.university]);
        if (!uni) continue;
        const dateV = C.date >= 0 ? r[C.date] : '';
        const year = /student/i.test(want) ? '' : (/2011/.test(want) ? '2011-2020' : want);
        orig.push({
            university: uni, norm: normUni(uni), country: str(C.country >= 0 ? r[C.country] : ''),
            year, date: (C.date >= 0 && typeof dateV === 'number') ? serialDate(dateV) : (parseTextDate(dateV) || str(dateV)),
            completedOn: C.completed >= 0 && typeof r[C.completed] === 'number' ? serialDate(r[C.completed]) : (C.completed >= 0 ? str(r[C.completed]) : ''),
            status: str(C.status >= 0 ? r[C.status] : ''), type: str(C.type >= 0 ? r[C.type] : ''),
            term: str(C.term >= 0 ? r[C.term] : ''), validity: str(C.validity >= 0 ? r[C.validity] : ''),
            remarks: str(C.remarks >= 0 ? r[C.remarks] : ''), person: str(C.person >= 0 ? r[C.person] : ''),
            email: str(C.email >= 0 ? r[C.email] : ''), link: str(C.link >= 0 ? r[C.link] : ''),
            sheet: sn,
        });
    }
}
console.log('original detail rows:', orig.length, '| ours:', ours.length);

// ---------- 3. match (many-to-one: our MoU + SE both map to tracker's combined row) ----------
function ratio(a, b) {
    if (!a || !b) return 0;
    const m = Math.max(a.length, b.length); if (!m) return 0;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return 1 - dp[a.length][b.length] / m;
}
const byNorm = new Map(), byLoose = new Map();
orig.forEach((x, i) => {
    (byNorm.get(x.norm) || byNorm.set(x.norm, []).get(x.norm)).push({ x, i });
    (byLoose.get(looseUni(x.norm)) || byLoose.set(looseUni(x.norm), []).get(looseUni(x.norm))).push({ x, i });
});
const matched = [], probable = [], inOursOnly = [];
const usedOrig = new Set();
for (const o of ours) {
    let cands = byNorm.get(o.norm) || byLoose.get(looseUni(o.norm)) || [];
    let fuzz = null, fuzzR = 0;
    if (!cands.length) {
        for (let i = 0; i < orig.length; i++) {
            if (usedOrig.has(i)) continue;
            const r = ratio(looseUni(o.norm), looseUni(orig[i].norm));
            if (r > fuzzR) { fuzzR = r; fuzz = { x: orig[i], i }; }
        }
        if (fuzz && fuzzR >= 0.80) cands = [fuzz];
    }
    if (!cands.length) { inOursOnly.push(o); continue; }
    // prefer an unused candidate whose agreement-kind matches ours
    // (Student Exchange <-> the tracker's Student Exchange sheet), then by
    // equal date, so a university's MoU and SE rows pair correctly instead of
    // both grabbing the dated MoU row.
    const oIsSE = /student.?exchange|student/i.test(o.type || '');
    let best = null, bestScore = -Infinity;
    for (const c of cands) {
        if (usedOrig.has(c.i)) continue;
        let s = 0;
        if (oIsSE === /student/i.test(c.x.sheet || '')) s += 10;
        if (o.date && c.x.date && o.date === c.x.date) s += 5;
        if (o.norm === c.x.norm) s += 2;
        if (s > bestScore) { bestScore = s; best = c; }
    }
    const c = best || cands.find(c => !usedOrig.has(c.i)) || cands[0];
    usedOrig.add(c.i);
    const pair = { o, x: c.x, oi: ours.indexOf(o), xi: c.i, ratio: fuzz ? fuzzR : 1 };
    (fuzz ? probable : matched).push(pair);
}
const inOrigOnly = orig.filter((_, i) => !usedOrig.has(i));
console.log('matched:', matched.length, '| probable:', probable.length, '| ours only:', inOursOnly.length, '| orig only:', inOrigOnly.length);

// ---------- 5. build the workbook ----------
const aoa = (rows, headers) => [headers, ...rows.map(r => headers.map(h => r[h]))];
const srt = (a, b) => (a.year || '').localeCompare(b.year || '') || a.university.localeCompare(b.university);
matched.sort((a, b) => srt(a.o, b.o));

// discrepancy buckets (for summary counts)
const buckets = { dateDiff: 0, dateOursMissing: 0, dateOursYearOnly: 0, statusConflict: 0, typeDiff: 0, termDiff: 0 };

function statusNote(a, b, bVal) {
    const as = normUni(a), bs = normUni(b), bv = normUni(bVal);
    if (!as && !bs) return '';
    if (/signed/.test(as)) {
        if (/inprogress|in process|in-progress/.test(bs)) { buckets.statusConflict++; return `orig IN PROGRESS (ours Signed)`; }
        if (/expired|expire/.test(bv) || /expired/.test(bs)) return `orig EXPIRED (ours Signed)`;   // signed then expired — not a conflict
        if (!bs && !bv) return '';
        return '';
    }
    if (/not signed/.test(as)) {
        if (/complet|signed|active/.test(bs + ' ' + bv)) { buckets.statusConflict++; return `ours NOT SIGNED, orig ${b || bVal}`; }
        return `ours Not Signed`;
    }
    if (/in progress|draft/.test(as)) {
        if (/complet|signed|active/.test(bs + ' ' + bv)) { buckets.statusConflict++; return `ours DRAFT, orig ${b || bVal}`; }
        if (/inprogress|in process/.test(bs)) return '';
        return `ours ${a}`;
    }
    if (/expired/.test(as)) {
        if (/active|complet|signed/.test(bs + ' ' + bv)) { buckets.statusConflict++; return `ours EXPIRED, orig ${b || bVal}`; }
        return '';
    }
    return '';
}
function typeNote(a, b) {
    const normT = (s) => str(s).toLowerCase().replace(/[^a-z]/g, '')
        .replace(/memorandumofunderstanding|memorandumofunderstandingmou|mou|mouandstudentexchange|mouandstudentexchange|studentexchangeagreement|studentexchange|exchangeagreement/g, 'se');
    const A = normT(a), B = normT(b);
    if (!A || !B) return '';
    if (A.includes(B) || B.includes(A)) return '';
    const map = { mous: 'se', sea: 'se', mous: 'se' };
    const a2 = map[A] || A, b2 = map[B] || B;
    if (a2 === b2 || a2.includes(b2) || b2.includes(a2)) return '';
    if (/(^|)(se|exchange|student)$/.test(a2) && /(^|)(se|exchange|student)$/.test(b2)) return '';
    buckets.typeDiff++; return `TYPE: ours "${a}" vs orig "${b}"`;
}
function termNote(a, b) {
    if (!a || !b) return '';
    if (normUni(a) === normUni(b)) return '';
    if (/indefinite/.test(a)) return ''; // our "Indefinite" vs a number — not a conflict
    if (normUni(a).includes('year') && normUni(b).includes('year') && normUni(a).replace(/\D/g, '') === normUni(b).replace(/\D/g, '')) return '';
    buckets.termDiff++; return `TERM: ours "${a}" vs orig "${b}"`;
}

function dateDiffFlag(a, b) {
    const da = a.length === 10 ? Date.parse(a + 'T00:00:00Z') : null;
    const db = b.length === 10 ? Date.parse(b + 'T00:00:00Z') : null;
    if (da && db) {
        const days = Math.round(Math.abs(da - db) / 86400000);
        if (days <= 1) { buckets.dateDiff++; return `±${days}d: ours ${a} / orig ${b}`; }
        buckets.dateDiff++; return `DIFFERS ${days}d: ours ${a} / orig ${b}`;
    }
    buckets.dateDiff++;
    return `DIFFERS: ours ${a} / orig ${b}`;
}

const matchRows = matched.map(({ o, x }) => {
    let dateFlag = '';
    if (o.date && x.date && o.date !== x.date) dateFlag = dateDiffFlag(o.date, x.date);
    else if (o.date && !x.date) { buckets.dateOursMissing++; dateFlag = 'date only in ours'; }
    else if (!o.date && x.date) { buckets.dateOursMissing++; dateFlag = 'date only in original'; }
    const statusFlag = statusNote(o.status, x.status, x.validity);
    const typeFlag = typeNote(o.type, x.type);
    const termFlag = termNote(o.term, x.term);
    const notes = [dateFlag, statusFlag, typeFlag, termFlag].filter(Boolean).join(' · ');
    return {
        University: o.university, 'Year (ours)': o.year, 'Year (orig)': x.year,
        'Date (ours)': o.date, 'Date (orig)': x.date,
        'Status (ours)': o.status, 'Status (orig)': x.status, 'Validity (orig)': x.validity,
        'Term (ours)': o.term, 'Term (orig)': x.term,
        'Type (ours)': o.type, 'Type (orig)': x.type,
        'Orig remarks': x.remarks, 'Orig sheet': x.sheet, 'Discrepancies': notes,
    };
});

const onlyRows = (list, label) => list.map(r => ({
    University: r.university, Year: label === 'o' ? r.year : r.year, Country: r.country,
    Agreement: label === 'o' ? r.type : r.type, Status: label === 'o' ? r.status : r.status,
    Date: label === 'o' ? r.date : r.date, Term: r.term, 'Validity': r.validity,
    'Source/Notes': label === 'o' ? (r.source || '') : (r.remarks || `sheet ${r.sheet}`),
}));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Comparison: prepared (mou-extracted.xlsx)  vs  original tracker (Copy of MoU & SE Original File.xlsx)'],
    [],
    ['Total records — prepared', ours.length],
    ['Total detail rows — original tracker', orig.length],
    ['Matched', matched.length],
    ['In prepared only (not in tracker)', inOursOnly.length],
    ['Probable match (fuzzy)', probable.length],
    ['In original tracker only (not prepared)', inOrigOnly.length],
    [],
    ['Note: original tracker also has a "Completed MoUs" roll-up sheet (108 completed rows) that repeats the per-year detail.'],
    ['Note: many "In original only" rows are InProgress/no-doc entries — the prepared workbook only holds documents found on disk.'],
    ['Note: our workbook splits MoU and Student Exchange into separate rows; the tracker has one combined row per university.'],
]), 'Summary');

XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matchRows), 'Matched');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(onlyRows(inOursOnly, 'o')), 'In Ours Only');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(onlyRows(inOrigOnly, 'x')), 'In Original Only');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(probable.map(p => ({ ...onlyRows([p.o], 'o')[0], 'Probable match to': p.x.university, 'similarity': p.ratio.toFixed(2) }))), 'Probable Match');

XLSX.writeFile(wb, OUT, { cellStyles: true });

// ---------- 6. console report ----------
console.log('\n=== summary ===');
console.log('matched          :', matched.length);
console.log('probable (fuzzy) :', probable.length);
console.log('ours only        :', inOursOnly.length);
console.log('orig only        :', inOrigOnly.length);
console.log('\n=== discrepancy buckets (across matched pairs) ===');
console.log('  date differs           :', buckets.dateDiff);
console.log('  date only in one side  :', buckets.dateOursMissing);
console.log('  status conflict        :', buckets.statusConflict);
console.log('  type differs           :', buckets.typeDiff);
console.log('  term differs           :', buckets.termDiff);
console.log('\n=== discrepancy highlights (Matched sheet) ===');
const flags = matchRows.filter(r => r.Discrepancies);
console.log(flags.length, 'of', matchRows.length, 'matched pairs have a discrepancy');
for (const r of flags.slice(0, 40)) console.log('  -', r.University.slice(0, 45), '::', r.Discrepancies.slice(0, 100));
console.log('\n=== In Ours Only (sample) ===');
for (const r of onlyRows(inOursOnly, 'o').slice(0, 25)) console.log('  -', r.Year, r.University.slice(0, 48), '|', r.Status);
console.log('\n=== In Original Only (sample) ===');
for (const r of onlyRows(inOrigOnly, 'x').slice(0, 25)) console.log('  -', r.Year, r.University.slice(0, 48), '|', r.Status, '|', r.Agreement);
console.log('\nWROTE:', OUT);
