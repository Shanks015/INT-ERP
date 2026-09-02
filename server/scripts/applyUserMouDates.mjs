// applyUserMouDates.mjs — read the dates the user filled into
// mou-nodate-to-check.xlsx (added column), apply them to the canonical
// _mou_out/<chunk>.json records, leave everything else's date blank, and
// rebuild mou-extracted.xlsx.
//
// Entry handling:
//   * m/d/yy date cell   -> set record.date (e.g. 2018-12-04)
//   * "15-112023" style  -> parsed as DD-MM-YYYY
//   * "no date no signature" / "no sign" / "not signed" -> status = Not Signed, date stays blank
//   * blank              -> leave the record untouched (per the user: "rest leave it blank")
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import XLSX from 'xlsx';

const TARGETS = JSON.parse(readFileSync('C:/Users/saish/Downloads/_mou_nodate_targets.json', 'utf-8')).targets;
const MOUT = 'C:/Users/saish/Downloads/_mou_out';
const CHK = 'C:/Users/saish/Downloads/mou-nodate-to-check.xlsx';

const str = (v) => String(v ?? '').trim();
const normUni = (s) => str(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---- read user entries (raw numbers + formatted display text) ----------------
const wb = XLSX.readFile(CHK, { cellNF: true });
const ws = wb.Sheets['Check these files'];
const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
const keys = Object.keys(rows[0]);
// added columns are the empty-header ones after 'Signed PDF ...' — the user may
// have typed into the 1st, 2nd or 3rd; pick the one that actually holds content.
const emptyCols = keys.filter(k => /^__EMPTY/.test(k));
const colKey = emptyCols.map(k => ({ k, n: rows.filter(r => str(r[k]) !== '').length }))
                        .sort((a, b) => b.n - a.n)[0].k;

const entries = []; // { row, uni, year, display }
for (const r of rows) {
  const uni = str(r.University);
  const year = str(r['Year Folder']);
  entries.push({ uni, year, display: str(r[colKey]) });
}

// ---- parse a user entry into {kind:'date', date} | {kind:'nosign'} | null -----
function parseEntry(v) {
  const s = str(v);
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);          // m/d/yy (US)
  if (m) {
    const [mo, d, yy] = [+m[1], +m[2], +m[3]];
    const y = yy < 100 ? 2000 + yy : yy;
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2040)
      return { kind: 'date', date: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
  }
  m = s.match(/^(\d{1,2})-(\d{2})(\d{4})$/);                     // DD-MMYYYY (Staffordshire "15-112023")
  if (m) {
    const [d, mo, y] = [+m[1], +m[2], +m[3]];
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2040)
      return { kind: 'date', date: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
  }
  if (/no date no signature|no sign|not signed|unsigned|no signature/i.test(s))
    return { kind: 'nosign', text: s };
  return { kind: 'text', text: s }; // something else the user wrote — we'll report it, not guess
}

// ---- load chunk records -------------------------------------------------------
const chunkOf = (label) => JSON.parse(readFileSync(`${MOUT}/${label}.json`, 'utf-8'));
const cache = new Map();
const getChunk = (label) => {
  if (!cache.has(label)) {
    const d = chunkOf(label);
    cache.set(label, { list: Array.isArray(d) ? d : (d.records || []), dirty: false });
  }
  return cache.get(label);
};

// ---- resolve each user entry -> target -> record -------------------------------
const results = { dates: [], nosign: [], text: [], blank: 0, unmatched: [] };

for (const e of entries) {
  if (!e.display) { results.blank++; continue; }
  const parsed = parseEntry(e.display);
  if (!parsed) { results.text.push(`${e.uni} — "${e.display}" (unparsed)`); continue; }

  // target = unique by (yearLabel, university)
  const cands = TARGETS.filter(t => t.yearLabel === e.year && normUni(t.university) === normUni(e.uni));
  if (cands.length !== 1) { results.unmatched.push(`${e.year} | ${e.uni} — ${cands.length} targets`); continue; }
  const t = cands[0];

  // record = in chunk, matching university (+ sourceFiles when the folder holds two records)
  const { list } = getChunk(e.year);
  let recs = list.filter(r => normUni(r.university || r.folder) === normUni(t.university));
  if (recs.length > 1) {
    const src0 = str(t.sourceFiles && t.sourceFiles[0]);
    if (src0) recs = recs.filter(r => str(r.sourceFiles).includes(src0));
  }
  if (recs.length !== 1) { results.unmatched.push(`${e.year} | ${e.uni} — ${recs.length} records`); continue; }
  const r = recs[0];

  if (parsed.kind === 'date') {
    r.date = parsed.date;
    r.remarks = [str(r.remarks), `date filled from signed PDF (manual check): ${parsed.date}`].filter(Boolean).join(' | ');
    getChunk(e.year).dirty = true;
    results.dates.push(`${e.year} | ${e.uni.slice(0, 40)} -> ${parsed.date}`);
  } else if (parsed.kind === 'nosign') {
    r.status = 'Not Signed';
    r.remarks = [str(r.remarks), 'manual check found no signature — status set to Not Signed, date left blank'].filter(Boolean).join(' | ');
    getChunk(e.year).dirty = true;
    results.nosign.push(`${e.year} | ${e.uni.slice(0, 40)} (was Signed) -> Not Signed`);
  } else {
    results.text.push(`${e.year} | ${e.uni} — "${e.display}" (not a date/signature note — left unchanged)`);
  }
}

// ---- persist changed chunks -----------------------------------------------------
for (const [label, { list, dirty }] of cache) {
  if (dirty) writeFileSync(`${MOUT}/${label}.json`, JSON.stringify(list, null, 2), 'utf-8');
}

// ---- rebuild the workbook -------------------------------------------------------
console.log('— user entries applied —');
console.log(results.dates.length + ' dates:', results.dates.join('\n  ') || '(none)');
if (results.nosign.length) console.log('\n' + results.nosign.length + ' set to Not Signed:\n  ' + results.nosign.join('\n  '));
if (results.text.length) console.log('\nUNPARSED text entries (not applied):\n  ' + results.text.join('\n  '));
if (results.unmatched.length) console.log('\nUNMATCHED (no action):\n  ' + results.unmatched.join('\n  '));
console.log('left blank (untouched):', results.blank);

console.log('\nrebuilding mou-extracted.xlsx ...');
const out = execSync('node D:/new-hope-erp/server/scripts/buildMouExtract.mjs', { encoding: 'utf-8' });
console.log(out.split('\n').slice(0, 6).join('\n'));
