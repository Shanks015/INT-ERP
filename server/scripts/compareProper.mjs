// compareProper.mjs — audit "Proper .xlsx" (original) against
// "Proper-cleaned.xlsx" (normalized). Prints a summary + side-by-side samples.
import XLSX from 'xlsx';

const ORIG = 'C:/Users/saish/Downloads/Proper .xlsx';
const CLEAN = 'C:/Users/saish/Downloads/Proper-cleaned.xlsx';

const normH = (h) => String(h || '').toLowerCase().replace(/[^a-z]/g, '');
const TOKENS = new Set([
    'slno', 'date', 'country', 'university', 'school', 'department',
    'completedon', 'completeddate', 'status', 'remarks', 'remark',
    'contaactemail', 'contactemail', 'email', 'agreement', 'doclink', 'link',
    'mouterm', 'moustatus', 'record', 'zip', 'validity', 'contactperson', 'person'
]);
const isHeader = (r) => r && r.filter(c => c != null && TOKENS.has(normH(c))).length >= 3;
const empty = (r) => !r || r.every(c => c == null || c === '');
const str = (v) => String(v ?? '').trim();
const short = (v) => str(v).slice(0, 42);

const owb = XLSX.readFile(ORIG);
const cwb = XLSX.readFile(CLEAN);
const oRows = XLSX.utils.sheet_to_json(owb.Sheets['MoU Update'], { header: 1, defval: null });
const cRows = XLSX.utils.sheet_to_json(cwb.Sheets['MoU Update'], { header: 1, defval: null });
const oData = oRows.filter(r => !empty(r));
const cData = cRows.slice(1).filter(r => !empty(r));

// Block boundaries in the ORIGINAL (same detection the normalizer uses).
const hdr = [];
for (let i = 0; i < oRows.length; i++) if (isHeader(oRows[i])) hdr.push(i);

console.log('COMPARISON: Proper .xlsx  vs  Proper-cleaned.xlsx');
console.log('==================================================');
console.log(`Original sheet: ${oData.length} non-empty source rows across ${hdr.length} paste-blocks`);
hdr.forEach((h, b) => {
    const end = (b + 1 < hdr.length ? hdr[b + 1] : oRows.length) - 1;
    const data = oRows.slice(h + 1, end + 1).filter(r => !empty(r)).length;
    console.log(`  Block ${b + 1}: ${data} data rows`);
});
console.log(`Cleaned file  : ${cData.length} records kept (ERP import schema)`);
console.log('');

// Date handling in the cleaned file: count real serials vs text dates.
let serialDates = 0, blankDates = 0;
for (const r of cData) {
    if (r[0] == null || r[0] === '') blankDates++;
    else if (typeof r[0] === 'number') serialDates++;
}
console.log('DATE COLUMNS in cleaned output:');
console.log(`  real Excel dates (serial) : ${serialDates}`);
console.log(`  blank                     : ${blankDates}`);
console.log(`  text dates left           : ${cData.filter(r => typeof r[0] === 'string').length}`);
console.log('');

// Side-by-side samples: find each university in the raw sheet and in the cleaned.
const SAMPLES = [
    ['Illinois Tech', 'Block 1'],
    ['University at Buffalo', 'Block 1'],
    ['Daffodil University', 'Block 3'],
    ['University of the Potomac', 'Block 3'],
    ['Asian Institute of Technology', 'Block 4'],
    ['University of Cardiff', 'Block 6 (recovered)'],
    ['Valparaiso University', 'Block 6']
];
console.log('SIDE-BY-SIDE (original raw row -> cleaned record):');
for (const [uni, tag] of SAMPLES) {
    const needle = uni.toLowerCase();
    const o = oData.find(r => str(r).toLowerCase().includes(needle));
    const c = cData.find(r => str(r[2]).toLowerCase().includes(needle));
    console.log(`\n-- ${uni}  (${tag})`);
    console.log(`  ORIGINAL : ${o ? o.map(short).join(' | ') : '(not found)'}`);
    console.log(`  CLEANED  : ${c ? c.map(short).join(' | ') : '(not in output)'}`);
}
