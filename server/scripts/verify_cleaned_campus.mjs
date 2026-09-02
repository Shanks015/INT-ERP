// verify_cleaned_campus.mjs — read-only. Round-trip the three cleaned workbooks: confirm every
// Date cell is dd/MMM/yyyy text that import.controller's parseDate text-branch accepts, counts per
// module are 89/23/2, and required cells (visitor/country/university) are all populated.
import XLSX from 'xlsx';

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// replicate import.controller.parseDate exactly
const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return new Date(Math.round((value - 25569) * 86400 * 1000));
    const s = String(value).trim();
    let m = s.match(/^(\d{1,2})[/\-.\s]\s*([A-Za-z]{3,9})[/\-.\s]\s*(\d{2,4})$/);
    if (m) {
        const day = +m[1];
        const month = String(m[2]).slice(0, 3).toLowerCase();
        let year = +m[3];
        if (year < 100) year += 2000;
        if (MONTHS[month] !== undefined) {
            const d = new Date(Date.UTC(year, MONTHS[month], day));
            if (d.getUTCFullYear() === year && d.getUTCMonth() === MONTHS[month] && d.getUTCDate() === day) return d;
        }
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

const files = [
    'FResh Campus visits_CLEANED_CampusVisits.xlsx',
    'FResh Campus visits_CLEANED_Seminars.xlsx',
    'FResh Campus visits_CLEANED_ConsultantVisits.xlsx'
];
const EXPECT = { 'FResh Campus visits_CLEANED_CampusVisits.xlsx': 89, 'FResh Campus visits_CLEANED_Seminars.xlsx': 23, 'FResh Campus visits_CLEANED_ConsultantVisits.xlsx': 2 };

let total = 0, allOk = true;
for (const f of files) {
    const wb = XLSX.readFile('C:/Users/saish/Downloads/' + f);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);
    console.log(`\n=== ${f}: ${data.length} rows (expect ${EXPECT[f]}) ${data.length === EXPECT[f] ? 'OK' : '*** MISMATCH ***'}`);
    const types = {};
    let dateFail = 0, blankReq = 0;
    for (const row of data) {
        const t = row.Type || '';
        types[t] = (types[t] || 0) + 1;
        const rawDate = row.Date;
        const dt = parseDate(rawDate);
        // must round-trip to the SAME dd/MMM/yyyy string
        if (!dt) { dateFail++; console.log(`  BAD DATE: "${rawDate}"`); }
        else {
            const back = `${String(dt.getUTCDate()).padStart(2, '0')}/${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getUTCMonth()]}/${dt.getUTCFullYear()}`;
            if (back !== rawDate) { dateFail++; console.log(`  DATE DRIFT: "${rawDate}" -> parses as ${back}`); }
        }
        if (!String(row["Visitor's Name & Details"] ?? '').trim() || !String(row.Country ?? '').trim() || !String(row['University Name'] ?? '').trim()) {
            blankReq++;
            console.log(`  BLANK REQUIRED: visitor="${row["Visitor's Name & Details"]}" country="${row.Country}" univ="${row['University Name']}"`);
        }
    }
    console.log('  types:', JSON.stringify(types));
    console.log(`  date failures: ${dateFail}, blank required: ${blankReq}`);
    if (dateFail || blankReq || data.length !== EXPECT[f]) allOk = false;
    total += data.length;
}
console.log(`\nTOTAL: ${total} (expect 114) ${total === 114 ? 'OK' : '*** MISMATCH ***'}`);
console.log(allOk && total === 114 ? '\nALL CHECKS PASSED' : '\n*** SOME CHECKS FAILED ***');
