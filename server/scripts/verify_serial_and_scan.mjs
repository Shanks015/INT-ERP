// verify_serial_and_scan.mjs — read-only.
// A) Confirm SheetJS cellDates decoding matches our manual serial->date (guards against 1904 date system).
// B) Scan University Visit rows' summaries for lecture/seminar/session language.
import XLSX from 'xlsx';

const file = 'C:\\Users\\saish\\Downloads\\FResh Campus visits.xlsx';

// SheetJS authoritative decode (auto-detects 1904)
const wbDates = XLSX.readFile(file, { cellDates: true });
const wsD = wbDates.Sheets[wbDates.SheetNames[0]];
const rowsD = XLSX.utils.sheet_to_json(wsD, { header: 1, raw: true, defval: null });

const iso = (d) => (d instanceof Date && !isNaN(d)) ? d.toISOString().slice(0, 10) : (d === null ? 'null' : String(d));

console.log('--- Serial rows: SheetJS cellDates decode vs manual formula ---');
// Manual formula (1900 system)
const manual = (serial) => new Date(Math.round((serial - 25569) * 86400000));
const rawRows = XLSX.utils.sheet_to_json(wbDates.Sheets[wbDates.SheetNames[0]], { header: 1, raw: true, defval: null });
for (let i = 1; i < rawRows.length; i++) {
    const v = rawRows[i][0];
    if (typeof v === 'number') {
        const sheetjs = rowsD[i][0];
        const m = manual(v);
        const a = iso(sheetjs), b = iso(m);
        console.log(`row${i + 1} serial=${v}  sheetjs=${a}  manual=${b}  ${a === b ? 'OK' : '*** MISMATCH ***'}`);
    }
}

// 1904 flag?
console.log('\ndate1904 =', wbDates.Workbook && wbDates.Workbook.WBProps ? wbDates.Workbook.WBProps.date1904 : 'unknown');

// B) scan University Visit rows
console.log('\n--- University Visit rows whose summary reads like a lecture/seminar/session ---');
const words = /\b(seminar|guest\s*lecture|lecture|delivered|workshop|session|talk|counsell|consultant|advisor)\b/i;
const raw = rawRows;
for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r.slice(0, 8).some((c) => c !== null && String(c).trim() !== '')) continue;
    const type = String(r[1] ?? '').trim();
    const summary = String(r[5] ?? '').trim();
    if (type === 'University Visit' && words.test(summary)) {
        const dateCell = rowsD[i][0];
        console.log(`row${i + 1} date=${iso(dateCell)} visitor=${String(r[2]).trim().slice(0, 50)}\n   summary=${summary.replace(/\s+/g, ' ').slice(0, 220)}`);
    }
}
