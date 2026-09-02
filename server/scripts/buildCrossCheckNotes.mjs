// buildCrossCheckNotes.mjs — compile every flagged / needs-verification item
// from the four merged workbooks into one cross-check list:
//   proper-scholarsinresidence.xlsx  (Scholars)
//   proper-studentexchange.xlsx      (Student Exchange)
//   proper-immersion.xlsx            (Immersion)
//   Proper-cleaned.xlsx              (MoU Update — read-only, not modified)
//
// Output: C:/Users/saish/Downloads/cross-check-notes.xlsx
// Columns: Priority | Module | Record | Dates / Window | What to check | Source workbook
import XLSX from 'xlsx';

const S = 'C:/Users/saish/Downloads/proper-scholarsinresidence.xlsx';
const X = 'C:/Users/saish/Downloads/proper-studentexchange.xlsx';
const I = 'C:/Users/saish/Downloads/proper-immersion.xlsx';
const M = 'C:/Users/saish/Downloads/Proper-cleaned.xlsx';
const OUT = 'C:/Users/saish/Downloads/cross-check-notes.xlsx';

const str = (v) => String(v ?? '').trim();
const flagArr = (s) => str(s).split('||').map(x => str(x)).filter(Boolean);

// An item is VERIFY when the flag points at something that must be checked by a
// human (conflicting dates, auto-corrections, skipped records, unmapped columns);
// INFO when it is pure bookkeeping (matched to Proper, source lists, derived-note
// already applied, recovered-and-confirmed).
const VERIFY_RE = /conflicts|vs Hub|precedes|corrected|derived|swapped|proper (start|end|note)|Arrival:|Departure:|fee only|skipped|unresolved|stray|not mapped/i;
const classify = (flags) => flags.some(f => VERIFY_RE.test(f)) ? 'VERIFY' : 'INFO';

const rows = [];

// --- Scholars ----------------------------------------------------------------
{
    const ws = XLSX.utils.sheet_to_json(XLSX.readFile(S).Sheets['Comparison'], { header: 1, defval: null });
    for (let i = 1; i < ws.length; i++) {
        const r = ws[i];
        const flags = flagArr(r[6]);
        if (!flags.length) continue;
        rows.push({
            priority: classify(flags),
            module: 'Scholars in Residence',
            record: `${str(r[0])} — ${str(r[1])}`,
            window: `${str(r[3])} -> ${str(r[4])}`,
            note: flags.join('  |  '),
            src: 'proper-scholarsinresidence.xlsx'
        });
    }
}

// --- Student Exchange --------------------------------------------------------
{
    const ws = XLSX.utils.sheet_to_json(XLSX.readFile(X).Sheets['Comparison'], { header: 1, defval: null });
    for (let i = 1; i < ws.length; i++) {
        const r = ws[i];
        const flags = flagArr(r[9]);
        if (!flags.length) continue;
        rows.push({
            priority: classify(flags),
            module: 'Student Exchange',
            record: `${str(r[0])} | ${str(r[1])} — ${str(r[2])}`,
            window: `${str(r[6])} -> ${str(r[7])}`,
            note: flags.join('  |  '),
            src: 'proper-studentexchange.xlsx'
        });
    }
}

// --- Immersion ---------------------------------------------------------------
{
    const ws = XLSX.utils.sheet_to_json(XLSX.readFile(I).Sheets['Comparison'], { header: 1, defval: null });
    for (let i = 1; i < ws.length; i++) {
        const r = ws[i];
        const flags = flagArr(r[11]);
        if (!flags.length) continue;
        rows.push({
            priority: classify(flags),
            module: 'Immersion Program',
            record: str(r[1]),
            window: `${str(r[6])} -> ${str(r[7])}`,
            note: flags.join('  |  '),
            src: 'proper-immersion.xlsx'
        });
    }
}

// --- MoU Update (from the Cleanup Log of Proper-cleaned.xlsx) -----------------
{
    // Block 1 stray column: gather the distinct source row numbers that carry a value.
    const log = XLSX.utils.sheet_to_json(XLSX.readFile(M).Sheets['Cleanup Log'], { header: 1, defval: null });
    const stray = log.slice(1).filter(r => str(r[2]).startsWith('col 6') && str(r[4]).match(/\d{2,4}[/\-.]\d{1,2}|\d{4,5}/));
    rows.push({
        priority: 'VERIFY',
        module: 'MoU Update',
        record: 'Block 1 — stray 7th column (col 6)',
        window: `${stray.length} rows`,
        note: `Block 1 of MoU Update has a second date-like column (col 6) that was NOT mapped to any output column. Examples: ${stray.slice(0, 3).map(r => `sr${r[1]} ${r[4]}`).join(', ')} ... Confirm whether these are a separate date field (e.g. MoU signed/uploaded date) or an artifact to ignore.`,
        src: 'Proper-cleaned.xlsx (Cleanup Log)'
    });
    for (const [sr, uni, ctry] of [
        [82, 'Institute National de Rescherche (Institut National de Recherche ...)', 'France'],
        [85, 'Regents of the University of California', 'USA']
    ]) {
        rows.push({
            priority: 'VERIFY',
            module: 'MoU Update',
            record: `Block 2, sheet row ${sr} — ${uni}`,
            window: 'no date',
            note: `Row skipped during cleaning — the Date cell is blank, so the record was dropped from the output. ${uni} / ${ctry} are present. Confirm whether a date exists (elsewhere) and the record should be restored.`,
            src: 'Proper-cleaned.xlsx (Cleanup Log)'
        });
    }
    rows.push({
        priority: 'INFO',
        module: 'MoU Update',
        record: 'Block 6, sheet row 257 — University of Cardiff',
        window: '21/05/2026',
        note: 'Date recovered with user confirmation: "5/21/0202" year typo read as 21/05/2026. Resolved — no action.',
        src: 'Proper-cleaned.xlsx (Cleanup Log)'
    });
}

// --- sort: VERIFY first, then by module, then by record ------------------------
const MOD = { 'Scholars in Residence': 0, 'Student Exchange': 1, 'Immersion Program': 2, 'MoU Update': 3 };
rows.sort((a, b) =>
    (a.priority === b.priority ? 0 : a.priority === 'VERIFY' ? -1 : 1) ||
    (MOD[a.module] - MOD[b.module]) ||
    a.record.localeCompare(b.record)
);

const HEADERS = ['Priority', 'Module', 'Record', 'Dates / Window', 'What to check', 'Source workbook'];
const aoa = [HEADERS, ...rows.map(r => [r.priority, r.module, r.record, r.window, r.note, r.src])];
const ws = XLSX.utils.aoa_to_sheet(aoa);
ws['!cols'] = [9, 20, 48, 18, 110, 34].map(w => ({ wch: w }));

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Cross-check');
XLSX.writeFile(wb, OUT, { cellStyles: true });

const nVerify = rows.filter(r => r.priority === 'VERIFY').length;
const nInfo = rows.filter(r => r.priority === 'INFO').length;
console.log('WROTE:', OUT);
console.log('==================================================');
console.log(`cross-check items total : ${rows.length}  (VERIFY=${nVerify}, INFO=${nInfo})`);
console.log();
for (const m of ['Scholars in Residence', 'Student Exchange', 'Immersion Program', 'MoU Update']) {
    const items = rows.filter(r => r.module === m);
    console.log(`${m}: ${items.length}  (${items.filter(r => r.priority === 'VERIFY').length} VERIFY)`);
}
console.log();
console.log('VERIFY ITEMS:');
for (const r of rows.filter(r => r.priority === 'VERIFY')) {
    console.log(`\n  [${r.module}] ${r.record}`);
    console.log(`     ${r.window}`);
    console.log(`     ${r.note}`);
}
