// buildNoDateTargets.mjs — collect the Signed records with an empty Date from
// the fan-out JSONs so a targeted re-read can hunt for the signing date in the
// last-page signature block of the scanned signed PDFs.
//
// Output: C:/Users/saish/Downloads/_mou_nodate_targets.json
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const DIR = 'C:/Users/saish/Downloads/_mou_out';
const OUT = 'C:/Users/saish/Downloads/_mou_nodate_targets.json';
const ROOT = 'C:/Users/saish/Downloads/MOU/MOU- Central';

// chunk label -> year folder on disk
const YEAR_DIR = {
  '2022': 'Old MoUs 2022', '2023-A': '2023', '2023-B': '2023', '2023-C': '2023',
  '2024-A': '2024', '2024-B': '2024', '2024-C': '2024',
  '2025-A': '2025', '2025-B': '2025', '2025-C': '2025',
  '2026-A': '2026', '2026-B': '2026', 'WIP': 'Work in Prog',
};

const files = readdirSync(DIR).filter(f => f.endsWith('.json') && f !== 'meta.json').sort();
const targets = [];

for (const f of files) {
  const label = f.replace(/\.json$/, '');
  const yearDir = YEAR_DIR[label];
  let data;
  try { data = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf-8')); } catch { continue; }
  const list = Array.isArray(data) ? data : (data && Array.isArray(data.records) ? data.records : []);
  for (const r of list) {
    const status = String(r.status || '').toLowerCase();
    const date = String(r.date || '').trim();
    if (/signed/.test(status) && !date) {
      const folder = r.folder || '';
      targets.push({
        yearLabel: label,
        path: yearDir ? `${ROOT}/${yearDir}${folder ? '/' + folder : ''}` : '',
        folder,
        university: r.university || folder,
        sourceFiles: String(r.sourceFiles || '').split(',').map(s => s.trim()).filter(Boolean),
      });
    }
  }
}

writeFileSync(OUT, JSON.stringify({ count: targets.length, targets }, null, 2), 'utf-8');
console.log('WROTE:', OUT);
console.log('Signed-with-no-date records:', targets.length);
const byYear = {};
for (const t of targets) byYear[t.yearLabel] = (byYear[t.yearLabel] || 0) + 1;
console.log('by chunk:', JSON.stringify(byYear));
