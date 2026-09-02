// inspect_campus.mjs — read-only dump of the campus-visits workbook structure.
// Prints: sheet names, first ~30 rows per sheet (raw), so we can see how the
// three categories (campus visit / seminar-guest lecture / consultant visit-masters desk)
// are laid out before any cleaning or module decisions.
import XLSX from 'xlsx';
import path from 'path';

const file = 'C:\\Users\\saish\\Downloads\\FResh Campus visits.xlsx';
const wb = XLSX.readFile(file);

console.log('Sheets:', wb.SheetNames);

for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    console.log(`\n========== SHEET: "${name}" | rows=${rows.length} ==========`);
    const max = Math.min(rows.length, 25);
    for (let i = 0; i < max; i++) {
        const cells = (rows[i] || []).map((c) => (c === null ? '' : String(c)));
        // Trim each cell to 80 chars for compactness
        const line = cells.map((c) => (c.length > 80 ? c.slice(0, 80) + '…' : c)).join(' | ');
        console.log(`${i}: ${line}`);
    }
    if (rows.length > 25) console.log(`... (${rows.length - 25} more rows)`);
    // Also dump the dimension / range of the sheet to detect extra columns
    const range = ws['!ref'];
    console.log(`range: ${range}`);
}
