// buildImmersion.mjs — compare Proper.xlsx / "Immersion Program" against
// "Immersion Program Details.xlsx" (Incoming + Outgoing) and emit a single
// merged, ERP-import-ready workbook: proper-immersion.xlsx.
//
// Reconciliation rules (each decision is also recorded in the Comparison sheet):
//   * Dates / pax / fees / days  -> prefer Immersion Program Details.xlsx
//     (verified correct where the two disagree: Curtin, Wollongong, UNC).
//   * Department / Summary / Drive Link / Status -> prefer Proper .xlsx
//     (Details has no such columns).
//   * Any field where the sources disagree is flagged, not silently resolved.
import XLSX from 'xlsx';

const PROPER = 'C:/Users/saish/Downloads/Proper .xlsx';
const DETAILS = 'C:/Users/saish/Downloads/Immersion Program Details.xlsx';
const OUT = 'C:/Users/saish/Downloads/proper-immersion.xlsx';

const str = (v) => String(v ?? '').trim();
const empty = (r) => !r || r.every(c => c == null || c === '');

// --- date helpers ----------------------------------------------------------
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
    const [, A, B, Y] = m;
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

// --- value normalizers ------------------------------------------------------
const numOf = (v) => {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    const t = str(v).replace(/,/g, '');
    const m = t.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
};
const currencyOf = (v) => {
    const t = str(v).toUpperCase();
    const m = t.match(/[A-Z]{3}/);
    return m ? m[0] : '';
};
const paxOf = (v) => {
    if (v == null) return null;
    if (typeof v === 'number') return v;
    const parts = str(v).split('+').map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
};
const normStatus = (v) => {
    const t = str(v).toLowerCase();
    if (t.includes('complet')) return 'Completed';
    if (t.includes('in') && (t.includes('prog') || t.includes('proc'))) return 'In Progress';
    return str(v);
};
const clean = (s) => str(s).replace(/\s+/g, ' ');   // collapse embedded newlines/extra spaces

// --- record identity (token match across the two sources) --------------------
function tokenOf(name) {
    const t = str(name).toLowerCase();
    if (t.includes('curtin')) return 'curtin';
    if (t.includes('stafford')) return 'stafford';
    if (t.includes('north carolina') || t.includes('charlotte')) return 'unc';
    if (t.includes('limkokwing')) return 'limkokwing';
    if (t.includes('wollongong')) return 'wollongong';
    if (t.includes('autosol')) return 'autosol';
    return null;
}

// --- read sources -------------------------------------------------------------
const properRows = XLSX.utils.sheet_to_json(XLSX.readFile(PROPER).Sheets['Immersion Program'], { header: 1, defval: null });
const det = XLSX.readFile(DETAILS);
const detRows = {
    Incoming: XLSX.utils.sheet_to_json(det.Sheets['Incoming'], { header: 1, defval: null }),
    Outgoing: XLSX.utils.sheet_to_json(det.Sheets['Outgoing'], { header: 1, defval: null })
};

// Accumulator: token -> merged record
const recs = new Map();
const add = (token, data) => {
    if (!recs.has(token)) recs.set(token, data);
    else Object.assign(recs.get(token), data);
};

// --- Proper .xlsx / Immersion Program (5 rows) --------------------------------
// Status | In/Out | Country | University | No of Pax | Summary | Arrival | Departure | Fees | Department | Link
for (let i = 1; i < properRows.length; i++) {
    const r = properRows[i];
    if (empty(r)) continue;
    const uni = r[3];
    const token = tokenOf(uni);
    if (!token) continue;
    const flags = [];
    add(token, {
        token,
        fromProper: true,
        proper: {
            status: r[0], direction: r[1], country: r[2], university: uni, pax: r[4],
            arrival: r[6], departure: r[7], fees: r[8], department: r[9], link: r[10], summary: r[5]
        },
        flags
    });
}

// --- Details Incoming ---------------------------------------------------------
// Sl No | Particulars | Country | University | No of Pax | Days | Arrival | Departure | Fees | Remarks | Column1
for (let i = 1; i < detRows.Incoming.length; i++) {
    const r = detRows.Incoming[i];
    if (empty(r)) continue;
    const token = tokenOf(r[3]);
    if (!token) continue;
    add(token, {
        token,
        fromDetails: true,
        detailsIn: {
            status: r[9], country: r[2], university: r[3], pax: r[4], days: r[5],
            arrival: r[6], departure: r[7], fees: r[8]
        }
    });
}

// --- Details Outgoing ---------------------------------------------------------
// Sl No | Particulars | Country | University | No of Pax | Days | Departure | Arrival | Fees | Remarks
for (let i = 1; i < detRows.Outgoing.length; i++) {
    const r = detRows.Outgoing[i];
    if (empty(r)) continue;
    const token = tokenOf(r[3]);
    if (!token) continue;
    add(token, {
        token,
        fromDetails: true,
        detailsOut: {
            status: r[9], country: r[2], university: r[3], pax: r[4], days: r[5],
            departure: r[6], arrival: r[7], fees: r[8]
        }
    });
}

// --- merge ---------------------------------------------------------------------
const HEADERS = [
    'Status', 'Incoming/Outgoing', 'Country', 'University', 'No of Pax', 'Pax Breakdown', 'Days',
    'Arrival Date', 'Departure Date', 'Fees Per Pax', 'Department', 'Summary',
    'Drive Link', 'Notes'
];
const outRows = [];
const audit = [];
const flagDiff = (flags, label, a, b) => {
    if (a !== b) flags.push(`${label}: ${a || '(none)'} vs ${b || '(none)'}`);
};

for (const rec of recs.values()) {
    const token = rec.token;
    const flags = [...(rec.flags || [])];
    const P = rec.proper, I = rec.detailsIn, O = rec.detailsOut;
    const source = P ? (I || O ? 'Both' : 'Proper only') : 'Details only';

    // Dates: prefer Details (verified more reliable); flag disagreements.
    let dArr = null, dDep = null;
    const pArr = parseDate(P && P.arrival), pDep = parseDate(P && P.departure);
    const dArrRaw = (I && I.arrival) || (O && O.arrival);
    const dDepRaw = (I && I.departure) || (O && O.departure);
    const dtArr = parseDate(dArrRaw), dtDep = parseDate(dDepRaw);
    dArr = dtArr || pArr;
    dDep = dtDep || pDep;
    if (pArr && dtArr && fmt(pArr) !== fmt(dtArr)) flagDiff(flags, 'Arrival', fmt(pArr), fmt(dtArr));
    if (pDep && dtDep && fmt(pDep) !== fmt(dtDep)) flagDiff(flags, 'Departure', fmt(pDep), fmt(dtDep));
    // Autosol (Details Outgoing, row 4): Departure/Arrival are entered swapped
    // relative to the sheet's own pattern (in every other row Departure holds
    // the later date). The coherent window is 14/06 - 28/06/2026 (Days = 15).
    if (token === 'autosol') {
        dArr = { y: 2026, m: 6, d: 14 };
        dDep = { y: 2026, m: 6, d: 28 };
        flags.push('Autosol Departure/Arrival swapped in source; window read as 14-Jun-2026 - 28-Jun-2026');
    }
    // Staffordshire departure was 45660 = 03/01/2025 (3 Jan) in BOTH sources —
    // a day/month transposition. User confirmed the real departure is 01/03/2025
    // (1 Mar); arrival stays 22/02/2025 (Days = 8 counted inclusively).
    if (token === 'stafford') {
        dDep = { y: 2025, m: 3, d: 1 };
        flags.push('Staffordshire departure corrected: 03-Jan-2025 -> 01-Mar-2025 (user-confirmed)');
    }
    // Internal sanity: departure before arrival.
    if (dArr && dDep && serialOf(dDep) < serialOf(dArr))
        flags.push(`Departure ${fmt(dDep)} precedes Arrival ${fmt(dArr)} — verify program window`);

    // Pax / fees / days / currency: prefer Details.
    const pPax = paxOf(P && P.pax), dPax = paxOf((I && I.pax) || (O && O.pax));
    if (pPax != null && dPax != null && pPax !== dPax) flagDiff(flags, 'Pax', pPax, dPax);
    const pFees = numOf(P && P.fees), dFees = numOf((I && I.fees) || (O && O.fees));
    if (pFees != null && dFees != null && pFees !== dFees) flagDiff(flags, 'Fees', pFees, dFees);
    if (pFees == null && dFees == null) flags.push('No fee recorded in either source');
    else if (pFees == null) flags.push('Fee only in Details');
    else if (dFees == null) flags.push('Fee only in Proper');

    const direction = (P && P.direction) || (I && 'Incoming') || (O && 'Outgoing') || '';
    const status = normStatus(P && P.status) || normStatus((I && I.status) || (O && O.status)) || '';
    const university = clean((I && I.university) || (O && O.university) || (P && P.university) || '');
    const country = (I && I.country) || (O && O.country) || (P && P.country) || '';
    const days = (I && I.days) || (O && O.days) || '';
    const currency = currencyOf((I && I.fees) || (O && O.fees)) || currencyOf(P && P.fees);

    const feeNum = dFees != null ? dFees : pFees;
    const feeText = feeNum == null ? '' : (currency ? `${feeNum} ${currency}` : String(feeNum));
    const rawPax = str((I && I.pax) || (O && O.pax) || (P && P.pax));
    outRows.push([
        status, direction, country, university,
        dPax != null ? dPax : pPax, rawPax, days,
        serialOf(dArr), serialOf(dDep), feeText,
        (P && P.department) || '',
        (P && P.summary) || '',
        (P && P.link) || '',
        flags.join('; ')
    ]);
    audit.push([token, university, direction, source, status, dPax, fmt(dArr), fmt(dDep), dFees != null ? dFees : pFees, days, currency, flags.join(' | ')]);
}

// Sort by direction then country for a stable, readable sheet.
outRows.sort((a, b) => (a[1] === b[1] ? a[2].localeCompare(b[2]) : a[1].localeCompare(b[1])));

// --- write ----------------------------------------------------------------------
const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...outRows]);
// dd/mm/yyyy display on the two date columns (6 and 7).
for (let r = 1; r <= outRows.length; r++) {
    for (const c of [7, 8]) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.t === 'n') cell.z = 'dd-mmm-yyyy';
    }
}
ws['!cols'] = [11, 16, 12, 42, 9, 12, 7, 13, 13, 11, 14, 60, 48, 60].map(w => ({ wch: w }));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Immersion Program');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Token', 'University', 'Direction', 'Source', 'Status', 'Pax', 'Arrival', 'Departure', 'Fees', 'Days', 'Currency', 'Flags'],
    ...audit
]), 'Comparison');
XLSX.writeFile(wb, OUT, { cellStyles: true });

// --- console report ---------------------------------------------------------------
console.log('WROTE:', OUT);
console.log('==================================================');
console.log('PROGRAMS  :', outRows.length);
console.log('Source    :', [...recs.values()].map(r => (r.fromProper && r.fromDetails ? 'Both' : r.fromProper ? 'Proper' : 'Details')).join(', '));
console.log();
console.log('COMPARISON (Proper vs Details, merged values):');
for (const a of audit) {
    console.log(`\n-- ${a[1]}  [${a[2]} | ${a[3]}]`);
    console.log(`   status=${a[4]} pax=${a[5]} arrival=${a[6]} departure=${a[7]} fees=${a[8]} days=${a[9]} curr=${a[10]}`);
    if (a[11]) console.log(`   FLAGS: ${a[11]}`);
}
