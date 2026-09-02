// applyMouRecoveredDates.mjs — fold the recovered signing dates from the
// no-date re-read (_mou_nodate_out/*.json) back into the canonical agent
// JSONs (_mou_out/<chunk>.json), then re-run buildMouExtract.mjs to rebuild
// mou-extracted.xlsx. Records are matched on folder + normalized university;
// when a folder holds two agreements (MoU + SEA), the recovered `source`
// filename disambiguates against the JSON record's sourceFiles.
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const NODATE_DIR = 'C:/Users/saish/Downloads/_mou_nodate_out';
const MOUT_DIR = 'C:/Users/saish/Downloads/_mou_out';

const str = (v) => String(v ?? '').trim();
const normUni = (s) => str(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const base = (f) => str(f).split(/[/\\]/).pop();

// --- load recovered dates -------------------------------------------------------
const recFiles = readdirSync(NODATE_DIR).filter(f => f.endsWith('.json'));
const recovered = [];
for (const f of recFiles) {
  let data;
  try { data = JSON.parse(readFileSync(`${NODATE_DIR}/${f}`, 'utf-8')); } catch (e) { console.log('skip unparseable', f, e.message); continue; }
  const list = Array.isArray(data) ? data : (data.records || []);
  for (const r of list) if (r.date) recovered.push({ file: f.replace(/\.json$/, ''), ...r });
}
console.log('recovered records with a date:', recovered.length);

// --- apply to canonical JSONs ----------------------------------------------------
let applied = 0, ambiguous = [], notFound = [];
const moutFiles = readdirSync(MOUT_DIR).filter(f => f.endsWith('.json') && f !== 'meta.json');
const cache = new Map();
const load = (f) => {
  if (!cache.has(f)) cache.set(f, JSON.parse(readFileSync(`${MOUT_DIR}/${f}`, 'utf-8')));
  return cache.get(f);
};

for (const rec of recovered) {
  const un = normUni(rec.university);
  let hit = null;
  for (const f of moutFiles) {
    const list = load(f);
    const recs = Array.isArray(list) ? list : (list.records || []);
    const candidates = recs.filter(r => normUni(r.university || r.folder) === un);
    if (!candidates.length) continue;
    if (candidates.length === 1) { hit = { f, r: candidates[0] }; break; }
    // multiple records in same folder (MoU + SEA) — disambiguate by source filename
    const bySrc = candidates.find(r => rec.source && str(r.sourceFiles).toLowerCase().includes(base(rec.source).toLowerCase()));
    if (bySrc) { hit = { f, r: bySrc }; break; }
    // also try exact folder match
    const byFolder = candidates.find(r => str(r.folder) === str(rec.folder));
    if (byFolder && candidates.filter(r => str(r.folder) === str(rec.folder)).length === 1) { hit = { f, r: byFolder }; break; }
    hit = { f, r: candidates[0], guess: true };
    break;
  }
  if (!hit) { notFound.push(rec); continue; }
  hit.r.date = str(rec.date);
  const add = `date recovered from ${rec.source}${rec.note ? ' — ' + rec.note : ''}`;
  hit.r.remarks = [str(hit.r.remarks), add].filter(Boolean).join(' | ');
  if (hit.guess) ambiguous.push(rec);
  applied++;
}

// --- write back canonical JSONs ---------------------------------------------------
for (const [f, data] of cache) writeFileSync(`${MOUT_DIR}/${f}`, JSON.stringify(data, null, 2), 'utf-8');

console.log('applied to canonical JSON :', applied);
console.log('ambiguous (guess)         :', ambiguous.length);
for (const a of ambiguous) console.log('  !', a.university, '<-', a.source);
console.log('not found in any chunk    :', notFound.length);
for (const n of notFound) console.log('  x', n.university, '(', n.folder, ')');

// --- rebuild the workbook ----------------------------------------------------------
console.log('\nrebuilding mou-extracted.xlsx ...');
const out = execSync('node D:/new-hope-erp/server/scripts/buildMouExtract.mjs', { encoding: 'utf-8' });
console.log(out.split('\n').slice(0, 8).join('\n'));
