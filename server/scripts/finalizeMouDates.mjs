// finalizeMouDates.mjs — apply the dates recovered by OCR back into the
// canonical agent JSONs, rebuild mou-extracted.xlsx, and produce the
// "please check these files" workbook (mou-nodate-to-check.xlsx) listing
// every signed no-date MoU the OCR could NOT date, with exact file paths.
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import XLSX from 'xlsx';

const MOUT = 'C:/Users/saish/Downloads/_mou_out';
const TARGETS = JSON.parse(readFileSync('C:/Users/saish/Downloads/_mou_nodate_targets.json', 'utf-8')).targets;
const LASTPAGE = JSON.parse(readFileSync('C:/Users/saish/Downloads/_mou_nodate_ocr/_lastpage_400.json', 'utf-8'));
const OUT_CHKLIST = 'C:/Users/saish/Downloads/mou-nodate-to-check.xlsx';

const str = (v) => String(v ?? '').trim();

// ---- dates recovered from OCR (document shows them; never guessed) -----------
const RECOVERED = [
  { folder: 'Multi Media University - Malasyia',
    university: 'Universiti Telekom Sdn Bhd (registered owner of Multimedia University, MMU)',
    srcMatch: 'MMU MoU Signed',
    tgt: 8,                                   // target index fully recovered -> skip on check list
    date: '2024-09-20',
    note: 'typed in recital: "ADDENDUM TO THE GENERAL AGREEMENT DATED 20TH SEPTEMBER 2024" — the general agreement date.' },
  { folder: 'Southern Federal University',
    university: 'Southern Federal University',
    tgt: 11,                                  // stays on check list (PARTIAL) — day/month still ambiguous
    date: '2023',
    note: 'signature block shows "2/6/23" — day/month ambiguous (Feb 6 vs Jun 2), year 2023 confirmed.' },
];
const skipTgt = new Set(RECOVERED.filter(r => r.date.match(/^\d{4}-\d{2}-\d{2}$/)).map(r => r.tgt)); // only fully-dated

// ---- apply to canonical JSONs -------------------------------------------------
const moutFiles = readdirSync(MOUT).filter(f => f.endsWith('.json') && f !== 'meta.json');
const cache = new Map();
const load = (f) => {
  if (!cache.has(f)) cache.set(f, JSON.parse(readFileSync(`${MOUT}/${f}`, 'utf-8')));
  return cache.get(f);
};
const normUni = (s) => str(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

let applied = 0;
for (const rec of RECOVERED) {
  const un = normUni(rec.university);
  for (const f of moutFiles) {
    const list = load(f);
    const recs = Array.isArray(list) ? list : (list.records || []);
    let cands = recs.filter(r => normUni(r.university || r.folder) === un);
    if (!cands.length) continue;
    if (rec.srcMatch) {
      const bySrc = cands.find(r => str(r.sourceFiles).toLowerCase().includes(rec.srcMatch.toLowerCase()));
      if (bySrc) cands = [bySrc];
    }
    const r = cands[0];
    r.date = rec.date;
    r.remarks = [str(r.remarks), `date recovered: ${rec.date} (${rec.note})`].filter(Boolean).join(' | ');
    applied++;
  }
}
for (const [f, data] of cache) writeFileSync(`${MOUT}/${f}`, JSON.stringify(data, null, 2), 'utf-8');
console.log('dates applied to canonical JSONs:', applied);

// ---- rebuild the workbook -----------------------------------------------------
console.log('\nrebuilding mou-extracted.xlsx ...');
const out = execSync('node D:/new-hope-erp/server/scripts/buildMouExtract.mjs', { encoding: 'utf-8' });
console.log(out.split('\n').slice(0, 6).join('\n'));

// ---- build the "please check these files" workbook ----------------------------
const notes = {
  0: 'Handwritten dates on signature block — OCR could not read them',
  1: 'Handwritten signing dates unreadable; "OGC Approved 04/01/2018-04/30/2020" is a legal approval window, NOT the signing date',
  2: 'Date fields blank in signature block',
  3: 'Signature block "Date:" handwritten, unreadable (Ref 2023/SEI/043)',
  4: 'Signed PDFs present; only linked approval email found: Dec 23, 2025 (Re: Approval for signing an MOU)',
  5: 'No date on MoU; email thread 2/27/23 is about the template/meeting only',
  6: 'Signature block handwritten, unreadable ("Dated: 3...")',
  7: 'Signature block handwritten, unreadable',
  9: 'Addendum signature block "Date: / /2024" blank; addendum recital names the general agreement dated 20-Sep-2024',
  10: 'Signature block present; email 9/25/23 (MOU between the RWTH and DSU)',
  11: 'PARTIAL — year 2023 recovered from signature block "2/6/23" (day/month ambiguous: Feb 6 vs Jun 2) — please confirm',
  12: 'Email 9/8/23 (E-introduction / Dual-Shared Degree); no date on agreement',
  13: 'Signature dates blank; proxy dated 26.09.2022 is the POA, not signing; email 3/16/23',
  14: 'Signature blocks blank; agreement is "2023 to 2024/25"; email thread Dec 21, 2022',
  15: 'Email 8/8/23 (short-programme webinar); signed MoU date not OCR-readable',
  16: 'Email 3/15/23 "Re: Draft MoU"; signed MoU date not readable',
  17: 'Email 10/29/24 (call summary, 21 Oct 20..); signed MoU date not readable',
  18: 'Email 6/21/24 (draft MOU review); signed MoU date not readable',
  19: 'Email 6/21/24; signed MoU date not readable',
  20: 'Email 10/15/24 (MOU + Provost visit); signed MoU date not readable',
  21: 'MoU is for summit 29-31 Oct 2024; signature blocks blank; email Aug 27, 2024',
  22: 'No date found anywhere in the signed copy',
  23: 'Email 7/30/25 (Draft MoU thread); signed MoU date not readable',
  24: 'Signed by INRTU one-side only; email 11/07/2025 (collaboration)',
  25: 'No date on doc (Center of Excellence MoU, 2025)',
  26: 'No date on doc (SEA draft)',
  27: 'Email 10/10/25; signed final has signature block, date not readable',
  28: 'Email 8/20/25 (visit of NJIT president); signed doc date not readable',
  29: 'Duration: effective when last signature obtained; no date found',
  30: 'No date found',
  31: 'Email 11/07/2025; MoU date not readable',
  32: 'Signed MoU date not readable',
  33: 'No date found; email thread only',
  34: 'Date field BLANK — "Date: / /2026" (day/month never filled); term 2026-2031',
  35: 'Email 7/8/26; signed EKTU PDF date not readable',
  36: 'Email 2/14/26 (DRAFT MOA); signature block date not readable',
  37: 'Signature block "Date:" blank on both sides; email 7/8/26',
};

const rows = [];
const lpByI = new Map(LASTPAGE.map(e => [e.i, e]));
for (const t of TARGETS) {
  const i = TARGETS.indexOf(t);
  const uni = t.university;
  if (skipTgt.has(i)) continue;                        // fully recovered -> not in check list
  const lp = lpByI.get(i);
  const pdfs = (lp && lp.pages || []).map(p => p.pdf).filter(Boolean);
  const signed = pdfs[0] || '';
  const fullPath = signed && !t.path.toLowerCase().endsWith('.pdf')
    ? `${t.path}/${signed}` : t.path;
  rows.push({
    University: uni,
    YearFolder: t.yearLabel,
    SignedPDF: fullPath,
    Notes: notes[i] || 'no date found',
  });
}

rows.sort((a, b) => String(a.YearFolder).localeCompare(String(b.YearFolder)) || a.University.localeCompare(b.University));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ['#', 'University', 'Year Folder', 'Signed PDF (open to check the signature-block date)', 'What OCR found'],
  ...rows.map((r, n) => [n + 1, r.University, r.YearFolder, r.SignedPDF, r.Notes]),
]), 'Check these files');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
  ['University', 'Recovered Date', 'Source', 'Note'],
  ...RECOVERED.map(r => [r.university, r.date, r.note, r.srcMatch || '']),
]), 'Recovered');
XLSX.writeFile(wb, OUT_CHKLIST, { cellStyles: true });

console.log('\nWROTE:', OUT_CHKLIST);
console.log('to check:', rows.length, '| recovered:', RECOVERED.length);
for (const r of rows) console.log(`  [${r.YearFolder}] ${r.University.slice(0, 50)}`);
