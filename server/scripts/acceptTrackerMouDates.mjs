// acceptTrackerMouDates.mjs — accept the original tracker's Date column as the
// authority and apply it to our canonical _mou_out/<chunk>.json records:
//   * ours has no date          -> fill from tracker
//   * ours is year-only, tracker full -> upgrade
//   * dates differ              -> accept the tracker's date (old value kept in Remarks)
// Does NOT touch mou-nodate-to-check.xlsx or Proper-cleaned.xlsx.
// Matching: exact norm first, then loose ("the / university of" + trailing ", university").
// Duplicate names (same university twice) are paired in order: our record k <-> tracker row k.
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import XLSX from 'xlsx';

const MOUT = 'C:/Users/saish/Downloads/_mou_out';
const ORIG = 'C:/Users/saish/Downloads/Copy of MoU & SE Original File.xlsx';

const str = (v) => String(v ?? '').trim();
const normUni = (s) => str(s).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
const looseUni = (s) => normUni(s).replace(/^(the |university of )/g, '').replace(/( university| university of)$/g, '').trim();
const serialDate = (serial) => {
    if (!(typeof serial === 'number') || !isFinite(serial) || serial < 20000) return '';
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};
// text dates the tracker stores as strings: DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY
const parseTextDate = (s) => {
    const m = str(s).match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (!m) return '';
    const [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 2000 || y > 2040) return '';
    let d, mo;
    if (a <= 31 && b <= 12) { d = a; mo = b; }        // DD/MM
    else if (a <= 12 && b <= 31) { d = b; mo = a; }   // MM/DD
    else return '';
    if (d < 1 || d > 31 || mo < 1 || mo > 12) return '';
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// ---- 1. parse the original tracker --------------------------------------------
const sheetCol = (hdrRow, rx) => { for (let i = 0; i < hdrRow.length; i++) if (rx.test(str(hdrRow[i]))) return i; return -1; };
const sheetByName = (want) => Object.keys(origWb.Sheets).find(sn => normUni(sn).replace(/\s+/g, '').includes(want)) || null;
const origWb = XLSX.readFile(ORIG);
const origRows = [];
for (const want of ['2026', '2025', '2024', '2023', '2011', 'studentexchange']) {
    const sn = sheetByName(want);
    if (!sn) { console.log('missing sheet', want); continue; }
    const rows = XLSX.utils.sheet_to_json(origWb.Sheets[sn], { defval: '', header: 1 });
    const h = rows[0];
    const cUni = sheetCol(h, /^univers/i);
    const cDate = sheetCol(h, /^date$/i);
    for (const r of rows.slice(1)) {
        const uni = str(r[cUni]);
        if (!uni) continue;
        const dv = cDate >= 0 ? r[cDate] : '';
        const norm = normUni(uni);
        origRows.push({
            university: uni, norm, loose: looseUni(norm),
            date: (cDate >= 0 && typeof dv === 'number') ? serialDate(dv) : (parseTextDate(dv) || str(dv)),
            sheet: sn,
        });
    }
}
const byNorm = new Map(), byLoose = new Map();
for (const x of origRows) {
    (byNorm.get(x.norm) || byNorm.set(x.norm, []).get(x.norm)).push(x);
    (byLoose.get(x.loose) || byLoose.set(x.loose, []).get(x.loose)).push(x);
}
console.log('original tracker rows:', origRows.length);

// ---- 2. group our records by match key (duplicates paired in order) ------------
const moutFiles = readdirSync(MOUT).filter(f => f.endsWith('.json') && f !== 'meta.json').sort();
const cache = new Map();
const getFile = (f) => {
    if (!cache.has(f)) cache.set(f, { data: JSON.parse(readFileSync(`${MOUT}/${f}`, 'utf-8')), dirty: false });
    return cache.get(f);
};
const groups = new Map();   // key -> { ours: [{file, r}], orig: [tracker rows] }
const noMatch = [];
for (const f of moutFiles) {
    const { data } = getFile(f);
    const list = Array.isArray(data) ? data : (data.records || []);
    for (const r of list) {
        const uni = str(r.university || r.folder);
        if (!uni) continue;
        const nk = normUni(uni);
        const lk = looseUni(nk);
        const key = byNorm.has(nk) ? nk : (byLoose.has(lk) ? lk : null);
        if (key === null) { noMatch.push(uni); continue; }
        if (!groups.has(key)) groups.set(key, { ours: [], orig: (byNorm.get(nk) || byLoose.get(lk) || []) });
        groups.get(key).ours.push({ file: f, r });
    }
}
console.log('our records matched to a tracker row:', Array.from(groups.values()).reduce((n, g) => n + g.ours.length, 0), '| no match:', noMatch.length);

// ---- 3. apply tracker dates -----------------------------------------------------
const results = { filled: [], changed: [], upgraded: [], skippedNoTrackerDate: [], unchanged: 0 };
const full = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);
const year = (d) => /^\d{4}$/.test(d);

for (const [key, g] of groups) {
    // dated tracker rows first, so a duplicated university pairs its records to
    // rows that carry a date (avoids blank-first ordering leaving ours unchanged)
    const ordered = [
        ...g.orig.filter(t => /^\d{4}(-\d{2}-\d{2})?$/.test(t.date)),
        ...g.orig.filter(t => !/^\d{4}(-\d{2}-\d{2})?$/.test(t.date)),
    ];
    for (let k = 0; k < g.ours.length; k++) {
        const { file, r } = g.ours[k];
        const t = ordered[Math.min(k, ordered.length - 1)];
        if (!t) continue;
        const tdate = full(t.date) ? t.date : (year(t.date) ? t.date : '');
        if (!tdate) { results.skippedNoTrackerDate.push(t.university); continue; }
        const cur = str(r.date);
        let action = null;
        if (full(tdate)) {
            if (!cur) action = 'fill';
            else if (year(cur)) action = 'upgrade';
            else if (cur !== tdate) action = 'change';
        } else if (!cur) action = 'fillyear';   // year-only tracker date into a blank
        if (!action) { results.unchanged++; continue; }
        switch (action) {
            case 'fill':
                r.date = tdate;
                r.remarks = [str(r.remarks), `date filled from original tracker (${t.sheet}): ${tdate}`].filter(Boolean).join(' | ');
                results.filled.push(`${t.university}: (none) -> ${tdate}`);
                break;
            case 'upgrade':
                r.date = tdate;
                r.remarks = [str(r.remarks), `date upgraded from original tracker (${t.sheet}): ${tdate} (was year ${cur})`].filter(Boolean).join(' | ');
                results.upgraded.push(`${t.university}: year ${cur} -> ${tdate}`);
                break;
            case 'change':
                r.date = tdate;
                r.remarks = [str(r.remarks), `date accepted from original tracker (${t.sheet}): ${tdate} (was ${cur})`].filter(Boolean).join(' | ');
                results.changed.push(`${t.university}: ${cur} -> ${tdate}`);
                break;
            case 'fillyear':
                r.date = tdate;
                r.remarks = [str(r.remarks), `year filled from original tracker (${t.sheet}): ${tdate}`].filter(Boolean).join(' | ');
                results.filled.push(`${t.university}: (none) -> ${tdate} (year only)`);
                break;
        }
        cache.get(file).dirty = true;
    }
}

// ---- 4. persist changed chunks --------------------------------------------------
let saved = 0;
for (const [f, { data, dirty }] of cache) {
    if (dirty) { writeFileSync(`${MOUT}/${f}`, JSON.stringify(data, null, 2), 'utf-8'); saved++; }
}
console.log('chunks written:', saved);

// ---- 5. rebuild the workbook + comparison -----------------------------------------
console.log('\nrebuilding mou-extracted.xlsx ...');
console.log(execSync('node D:/new-hope-erp/server/scripts/buildMouExtract.mjs', { encoding: 'utf-8' }).split('\n').slice(0, 3).join('\n'));
console.log('\nrebuilding comparison workbook ...');
console.log(execSync('node D:/new-hope-erp/server/scripts/buildMouVsOriginal.mjs', { encoding: 'utf-8' }).split('\n').slice(0, 12).join('\n'));

// ---- 6. report ---------------------------------------------------------------------
console.log('\n=== tracker dates accepted ===');
console.log('filled  (ours was blank)      :', results.filled.length);
for (const s of results.filled) console.log('  +', s);
console.log('changed (ours differed)       :', results.changed.length);
for (const s of results.changed) console.log('  ~', s);
console.log('upgraded (year -> full date)  :', results.upgraded.length);
for (const s of results.upgraded) console.log('  ^', s);
console.log('\nnot applied:');
console.log('  tracker row had no date     :', results.skippedNoTrackerDate.length);
console.log('  unchanged / equal / no match:', results.unchanged + noMatch.length, `(${results.unchanged} unchanged, ${noMatch.length} no tracker match)`);
