// buildStudentExchange.mjs — compare "Proper .xlsx / Student Exchange" against
// "Student exchange excel (1).xlsx" (Outgoing + Incomig sheets) and emit a
// single merged, data-first workbook: proper-studentexchange.xlsx.
//
// No ERP-schema forcing. Reconciliation rules (all decisions recorded in the
// Comparison sheet / Notes column):
//   * Student list is the union (22) — Excel is the superset.
//   * Name / Course / University / USN / Status / Remarks / Duration come from
//     Excel (richer). Proper supplies structured From/To dates + drive links.
//   * Where a Proper date falls outside the Duration's month-window it is
//     corrected from the Duration text; Excel-only students get From/To derived
//     from Duration (flagged). Everything ambiguous is flagged, not guessed.
import XLSX from 'xlsx';

const EXCEL = 'C:/Users/saish/Downloads/Student exchange excel (1).xlsx';
const PROPER = 'C:/Users/saish/Downloads/Proper .xlsx';
const OUT = 'C:/Users/saish/Downloads/proper-studentexchange.xlsx';

const str = (v) => String(v ?? '').trim();
const clean = (s) => str(s).replace(/\s+/g, ' ');
const empty = (r) => !r || r.every(c => c == null || c === '');

// --- dates ------------------------------------------------------------------
function parseDate(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate() };
    if (typeof v === 'number') {
        const q = XLSX.SSF.parse_date_code(v);
        return q ? { y: q.y, m: q.m, d: q.d } : null;
    }
    const s = str(v);
    const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (!m) return null;
    let [, A, B, Y] = m;
    let y = +Y;
    if (Y.length === 2) y = 2000 + y;
    let d, mo;
    if (s.includes('-')) { d = +A; mo = +B; }
    else if (+A > 12) { d = +A; mo = +B; }
    else if (+B > 12) { d = +B; mo = +A; }
    else { d = +A; mo = +B; }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y, m: mo, d };
}
const serialOf = (p) => p ? Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(1899, 11, 30)) / 86400000) : null;
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (p) => p ? `${String(p.d).padStart(2, '0')}-${MONTH_ABBR[p.m - 1]}-${p.y}` : '';
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// --- duration text -> approximate From/To ------------------------------------
const MONTHS = {};
['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
 'September', 'October', 'November', 'December'].forEach((n, i) => {
    MONTHS[n.toLowerCase()] = i + 1;
    MONTHS[n.toLowerCase().slice(0, 3)] = i + 1;
});
MONTHS['sept'] = 9;
function parseDuration(s) {
    const t = clean(s);
    if (!t) return { p: null, note: null, certain: false };
    const m = t.match(/^([a-zA-Z]+)\s*(?:(\d{4}))?\s*[-–]\s*([a-zA-Z]+)\s*(?:(\d{4}))?\s*$/);
    if (!m) return { p: null, note: `Duration not parseable: "${t}"`, certain: false };
    const [, m1, y1, m2, y2] = m;
    const M1 = MONTHS[m1.toLowerCase()], M2 = MONTHS[m2.toLowerCase()];
    if (!M1 || !M2) return { p: null, note: `Unknown months in duration: "${t}"`, certain: false };
    let Y1 = y1 ? +y1 : null, Y2 = y2 ? +y2 : null;
    let certain = true;
    if (Y1 && !Y2) Y2 = M1 > M2 ? Y1 + 1 : Y1;        // "Sep 2024 - Feb" -> Feb 2025
    else if (!Y1 && Y2) {
        if (M1 > M2) { Y1 = Y2; Y2 = Y1 + 1; certain = false; }  // "Sep - Feb 2024": cross-year,
        else Y1 = Y2;                                // read year as START year, mark ambiguous
    }
    if (!Y1 || !Y2) return { p: null, note: `Duration missing year: "${t}"`, certain: false };
    if (Y1 < 2000 || Y1 > 2035 || Y2 < 2000 || Y2 > 2035) return { p: null, note: `Duration year odd: "${t}"`, certain: false };
    return {
        p: { from: { y: Y1, m: M1, d: 1 }, to: { y: Y2, m: M2, d: lastDay(Y2, M2) } },
        note: `Dates derived from duration text "${t}"`,
        certain
    };
}

// --- names & status -----------------------------------------------------------
const normName = (s) => String(s || '')
    .toLowerCase()
    .replace(/^(mr|ms|mrs|dr)\.?\s+/, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const normStatus = (v) => {
    const t = str(v).toLowerCase();
    if (t === 'completed' || t === 'completed.') return 'Completed';
    if (t === 'opted out') return 'Opted Out';
    if (t === 'on going' || t === 'ongoing') return 'On Going';
    if (t === 'cancelled' || t === 'canceled') return 'Cancelled';
    if (t === 'withdrawn') return 'Withdrawn';
    if (t === 'pending') return 'Pending';
    return str(v);
};
// Jena's status cell is "On going > visa approved ... <notes>" -> split.
function splitStatus(cell) {
    const s = str(cell);
    if (!s) return { status: '', remarks: '' };
    const i = s.indexOf('>');
    if (i === -1) return { status: normStatus(s), remarks: '' };
    return { status: normStatus(s.slice(0, i)), remarks: clean(s.slice(i + 1)) };
}

// --- read Excel ----------------------------------------------------------------
const xw = XLSX.readFile(EXCEL);
const xRecs = [];
for (const [sheet, dir] of [['Outgoing', 'Outgoing'], ['Incomig', 'Incoming']]) {
    const rows = XLSX.utils.sheet_to_json(xw.Sheets[sheet], { header: 1, defval: null });
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (empty(r)) continue;
        const isIn = sheet === 'Incomig';
        const { status, remarks } = splitStatus(r[isIn ? 5 : 6]);
        const rec = {
            dir, name: clean(r[1]), course: clean(r[2]),
            usn: isIn ? '' : clean(r[3]),
            uni: clean(r[isIn ? 3 : 4]),
            duration: clean(r[isIn ? 4 : 5]),
            status,
            remarks: remarks || clean(isIn ? r[6] : ''),
            link: clean(r[7]),
            extra: isIn ? clean(r[8]) : ''
        };
        if (rec.extra) rec.remarks = [rec.remarks, rec.extra].filter(Boolean).join(' | ');
        xRecs.push(rec);
    }
}

// --- read Proper ----------------------------------------------------------------
const pw = XLSX.readFile(PROPER);
const pRows = XLSX.utils.sheet_to_json(pw.Sheets['Student Exchange'], { header: 1, defval: null });
const pByName = new Map(), pByUsn = new Map();
for (let i = 1; i < pRows.length; i++) {
    const r = pRows[i];
    if (empty(r)) continue;
    const rec = {
        key: normName(r[1]), name: clean(r[1]), course: clean(r[2]), sem: clean(r[3]),
        usn: clean(r[4]), uni: clean(r[5]), from: r[6], to: r[7],
        status: clean(r[8]), link: clean(r[10])
    };
    pByName.set(rec.key, rec);
    if (rec.usn && rec.usn !== '-') pByUsn.set(rec.usn, rec);
}

// --- merge ---------------------------------------------------------------------
const HEADERS = [
    'Direction', 'Student Name', 'Course', 'USN', 'Exchange University', 'Duration',
    'From Date', 'To Date', 'Semester / Year', 'Status', 'Remarks', 'Document Link', 'Notes'
];
const outRows = [];
const audit = [];

for (const x of xRecs) {
    const flags = [];
    let proper = pByName.get(normName(x.name));
    let matchedBy = 'name';
    if (!proper && x.usn) { proper = pByUsn.get(x.usn) || null; if (proper) matchedBy = 'USN'; }
    if (proper && matchedBy === 'USN')
        flags.push(`Matched to Proper by USN (Proper name cell held "${proper.name}")`);

    // From/To dates — prefer Proper's exact serials; only override when the
    // Duration text (CERTAIN reading) puts a Proper date outside its window.
    let fromP = proper ? parseDate(proper.from) : null;
    let toP = proper ? parseDate(proper.to) : null;
    const dur = parseDuration(x.duration);
    let derived = false;
    if (dur.p) {
        if (dur.certain) {
            if (fromP && (serialOf(fromP) < serialOf(dur.p.from) || serialOf(fromP) > serialOf(dur.p.to))) {
                flags.push(`From corrected: Proper ${fmt(fromP)} -> ${fmt(dur.p.from)} (outside Duration "${x.duration}")`);
                fromP = dur.p.from; derived = true;
            }
            if (toP && (serialOf(toP) < serialOf(dur.p.from) || serialOf(toP) > serialOf(dur.p.to))) {
                flags.push(`To corrected: Proper ${fmt(toP)} -> ${fmt(dur.p.to)} (outside Duration "${x.duration}")`);
                toP = dur.p.to; derived = true;
            }
        }
        if (!fromP) { fromP = dur.p.from; derived = true; }
        if (!toP) { toP = dur.p.to; derived = true; }
        if (!dur.certain && !proper)
            flags.push(`Duration "${x.duration}" is cross-year with a single year; read as ${fmt(dur.p.from)} - ${fmt(dur.p.to)} — approximate, verify`);
    } else if (!fromP && !toP) {
        flags.push(dur.note || 'No duration in source — From/To left blank');
    }
    if (dur.p && (derived || !proper)) flags.push(dur.note);
    if (fromP && toP && serialOf(toP) < serialOf(fromP))
        flags.push(`To ${fmt(toP)} precedes From ${fmt(fromP)} — verify`);

    // link
    let link = proper && proper.link ? proper.link : x.link || '';
    if (proper && proper.link && x.link && clean(proper.link) !== clean(x.link))
        flags.push('Different links in the two sources');

    outRows.push([
        x.dir, x.name, x.course, x.usn || '', x.uni, x.duration,
        serialOf(fromP), serialOf(toP),
        (proper && proper.sem) || '',
        x.status, x.remarks, link,
        flags.join('; ')
    ]);
    audit.push([
        x.dir, x.name, x.uni, x.duration,
        proper ? fmt(parseDate(proper.from)) : '(none)',
        proper ? fmt(parseDate(proper.to)) : '(none)',
        fmt(fromP), fmt(toP), x.status,
        flags.join(' | ')
    ]);
}

outRows.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));

// --- write ----------------------------------------------------------------------
const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...outRows]);
for (let r = 1; r <= outRows.length; r++) {
    for (const c of [6, 7]) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = 'dd-mmm-yyyy';
    }
}
ws['!cols'] = [10, 22, 30, 16, 34, 22, 12, 12, 13, 11, 55, 48, 55].map(w => ({ wch: w }));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Student Exchange');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Direction', 'Student Name', 'University', 'Duration', 'Proper From', 'Proper To', 'Merged From', 'Merged To', 'Status', 'Flags'],
    ...audit
]), 'Comparison');
XLSX.writeFile(wb, OUT, { cellStyles: true });

// --- console report ---------------------------------------------------------------
console.log('WROTE:', OUT);
console.log('==================================================');
console.log('STUDENTS:', outRows.length, `(${outRows.filter(r => r[0] === 'Incoming').length} Incoming, ${outRows.filter(r => r[0] === 'Outgoing').length} Outgoing)`);
console.log();
for (const a of audit) {
    console.log(`\n-- ${a[1]}  [${a[0]}]  ${a[2]}`);
    console.log(`   duration="${a[3]}"  proper: ${a[4]} -> ${a[5]}   merged: ${a[6]} -> ${a[7]}   status=${a[8]}`);
    if (a[9]) console.log(`   FLAGS: ${a[9]}`);
}
