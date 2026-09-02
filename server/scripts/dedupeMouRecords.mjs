// dedupeMouRecords.mjs — remove true duplicate entries from the canonical
// _mou_out/<chunk>.json records and rebuild the workbook.
//
//  A) RESTORE old-agreement dates that the tracker-accept pass wrongly paired
//     with a modern-year row (our 2022-folder records ARE the tracker's
//     2011-sheet 2011-2020 agreements, not duplicates of renewals):
//        RIT (2022)           2026-02-20 -> 2017-01-09  (2011-sheet "Rochester Institute of Techonology - New York")
//        Huddersfield (2022)  2024-04-30 -> 2019-06-03  (2011-sheet "Te University of Huddersfield")
//        Leeds Beckett (2026) 2025-06-11 -> 2026-02-13  (tracker 2026 Completed row; 2025 rows are drafts)
//  B) REMOVE true duplicates (the same agreement captured twice):
//        WIP  MMSU MoU   (dup of 2024-B general MoU)
//        WIP  MMSU MoA   (dup of 2024-B CHS Pharmacy/PT MoA — same source docx)
//        WIP  Dragomanov (dup of 2024-A)
//        WIP  Oguz Han   (dup of 2024-B)
//        WIP  MMU SE     (unsigned template; signed copy in 2023-B)
//        2025-C Buffalo MoU (draft; signed copy kept)
//        2023-C UNILAK MoU  (overlap folder Doc1.pdf; real MoU kept)
//        2025-B Leeds Beckett MoU (draft; signed copy in 2026-A)
//        2025-B MIET MoU         (draft-files; signed copy in 2023-B)
//        2024-B Lutsk            (email-only, no agreement type; MoU kept in 2025-B)
//        2025-A Tavria MoU + SE  (dup of the 2025-C pair)
//
// Every removal is matched by an explicit predicate and must match an exact
// expected count or the run aborts BEFORE anything is written. Removed records
// are backed up to _mou_out/_removed_duplicates.json; unique contact info is
// merged into the kept record's remarks.
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

const MOUT = 'C:/Users/saish/Downloads/_mou_out';
const str = (v) => String(v ?? '').trim();
const normUni = (s) => str(s).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
const NU = (s) => normUni(s);

const cache = new Map();
const getFile = (f) => {
    if (!cache.has(f)) cache.set(f, { data: JSON.parse(readFileSync(`${MOUT}/${f}`, 'utf-8')), dirty: false });
    return cache.get(f);
};
const listOf = (data) => (Array.isArray(data) ? data : (data.records || []));

let fatal = false;
const report = { restores: [], removed: [], kept: [], flagged: [] };
const backup = [];

const keepCounterpart = (removedRec, keptFile, keptNorm) => {
    const { data } = getFile(keptFile);
    const k = listOf(data).find(r => NU(r.university || r.folder) === keptNorm);
    if (!k) return;
    const contact = str(removedRec.contactPerson);
    const email = str(removedRec.contactEmail);
    const date = str(removedRec.date);
    const bits = [];
    if (contact || email) bits.push(`contact ${contact}${email ? ' / ' + email : ''}`);
    if (date && !str(k.date)) bits.push(`date from duplicate record: ${date}`);
    if (bits.length) {
        k.remarks = [str(k.remarks), `merged from duplicate (${str(removedRec.sourceFiles).split(/[,;]/)[0].slice(0, 40)}): ${bits.join('; ')}`].filter(Boolean).join(' | ');
        cache.get(keptFile).dirty = true;
    }
};

const remove = (file, pred, why, expect, keptFile = '', keptNorm = '') => {
    const { data } = getFile(file);
    const list = listOf(data);
    const removed = list.filter(pred);
    if (removed.length !== expect) {
        fatal = true;
        console.log(`!! ABORT-guard: ${file} "${why}" matched ${removed.length}, expected ${expect} — NOT removed`);
        return;
    }
    const kept = list.filter(r => !pred(r));
    if (keptFile) removed.forEach(r => keepCounterpart(r, keptFile, keptNorm));
    if (Array.isArray(data)) cache.get(file).data = kept;
    else cache.get(file).data.records = kept;
    cache.get(file).dirty = true;
    backup.push(...removed.map(r => ({ ...r, _removedFrom: file, _reason: why })));
    report.removed.push(...removed.map(r => `  [${file}] ${(r.university || r.folder).slice(0, 55)} (${why})`));
    report.kept.push(`  kept: ${keptFile} (${keptNorm.slice(0, 45)})`);
    console.log(`removed ${removed.length} from ${file}: ${why}`);
};

const restore = (file, pred, date, note, expect = 1) => {
    const { data } = getFile(file);
    const list = listOf(data);
    const hits = list.filter(pred);
    if (hits.length !== expect) { fatal = true; console.log(`!! ABORT-guard: ${file} restore matched ${hits.length}, expected ${expect} — not applied`); return; }
    for (const r of hits) {
        r.date = date;
        // drop the now-contradictory "date accepted from original tracker" suffix, keep the rest
        const rest = str(r.remarks).replace(/\| date accepted from original tracker \([^)]*\): [^|]*/g, '').replace(/^[| ]+/, '');
        r.remarks = [note, rest].filter(Boolean).join(' | ');
    }
    cache.get(file).dirty = true;
    report.restores.push(`  [${file}] -> ${date}: ${note}`);
    console.log(`restored ${hits.length} in ${file} -> ${date}`);
};

// ---------- A) restorations / fixes ----------
restore('2022.json', r => /rochester institute of technology/.test(NU(r.university)),
    '2017-01-09',
    'date restored to 2017-01-09: this is the 2011-sheet agreement ("Rochester Institute of Techonology - New York"); the 2026-02-20 tracker date belongs to the 2026 renewal.');
restore('2022.json', r => /huddersfield/.test(NU(r.university)),
    '2019-06-03',
    'date restored to 2019-06-03: this is the 2011-sheet agreement ("Te University of Huddersfield"); the 2024-04-30 tracker date belongs to the 2024 renewal.');
restore('2026-A.json', r => /leeds beckett/.test(NU(r.university)),
    '2026-02-13',
    'date set to 2026-02-13 (tracker 2026 "Completed" row — the signed MoU; the 2025 tracker rows are drafts). Signed PDF dated ~16-17 Feb 2026.');

// ---------- B) removals ----------
// WIP — all five records there duplicate records already filed in other chunks
remove('WIP.json', r => /mariano marcos/.test(NU(r.university)) && r.agreementType === 'MoU',
    'dup of 2024-B general MoU', 1, '2024-B.json', NU('Mariano Marcos State University'));
remove('WIP.json', r => /mariano marcos/.test(NU(r.university)) && r.agreementType === 'MoA',
    'dup of 2024-B CHS Pharmacy/PT MoA (same source docx)', 1, '2024-B.json', NU('Mariano Marcos State University (College of Health Sciences)'));
remove('WIP.json', r => /dragomanov/.test(NU(r.university)),
    'dup of 2024-A', 1, '2024-A.json', NU('Dragomanov Ukrainian State University'));
remove('WIP.json', r => /oguz han/.test(NU(r.university)),
    'dup of 2024-B (same intended Oguz Han MoU)', 1, '2024-B.json', NU('Oguz Han Engineering and Technology University of Turkmenistan'));
remove('WIP.json', r => /multimedia|universiti telekom/.test(NU(r.university)),
    'unsigned template; signed copy in 2023-B', 1, '2023-B.json', NU('Universiti Telekom Sdn Bhd (registered owner of Multimedia University, MMU)'));

// same-chunk / cross-chunk duplicates
remove('2025-C.json', r => /buffalo/.test(NU(r.university)) && /draft/i.test(r.status),
    'email-draft MoU; signed copy kept', 1, '2025-C.json', NU('University at Buffalo, The State University of New York'));
remove('2023-C.json', r => /lay adventists/.test(NU(r.university)) && /Doc1\.pdf/.test(str(r.sourceFiles)),
    'overlap-folder duplicate (Doc1.pdf); real MoU kept', 1, '2023-C.json', NU('University of Lay Adventists of Kigali (UNILAK)'));
remove('2025-B.json', r => /leeds beckett/.test(NU(r.university)) && /draft/i.test(r.status),
    'draft MoU; signed copy kept in 2026-A', 1, '2026-A.json', NU('Leeds Beckett University'));
remove('2025-B.json', r => /electronic technology/.test(NU(r.university)) && /^mou$/i.test(r.agreementType),
    'MoU with draft-files; signed copy in 2023-B', 1, '2023-B.json', NU('National Research University of Electronic Technology (MIET)'));
remove('2024-B.json', r => /lutsk/.test(NU(r.university)) && !r.agreementType,
    'email-only, no agreement type; MoU kept in 2025-B', 1, '2025-B.json', NU('Lutsk National Technical University'));
remove('2025-A.json', r => /tavria/.test(NU(r.university)),
    'dup of the 2025-C pair (MoU + SE)', 2, '2025-C.json', NU('Dmytro Motornyi Tavria State Agrotechnological University (TSATU)'));

// ---------- persist ----------
if (fatal) { console.log('\nABORTED — no files written. Fix the predicates above and re-run.'); process.exit(1); }
let written = 0;
for (const [f, { data, dirty }] of cache) {
    if (dirty) { writeFileSync(`${MOUT}/${f}`, JSON.stringify(data, null, 2), 'utf-8'); written++; }
}
if (backup.length) {
    let prev = [];
    try { prev = JSON.parse(readFileSync(`${MOUT}/_removed_duplicates.json`, 'utf-8')); } catch {}
    writeFileSync(`${MOUT}/_removed_duplicates.json`, JSON.stringify([...prev, ...backup], null, 2), 'utf-8');
}
console.log('chunks written:', written, '| records removed total:', backup.length);
console.log('backup: C:/Users/saish/Downloads/_mou_out/_removed_duplicates.json');

// ---------- rebuild ----------
const run = (label, cmd) => {
    try { console.log('\n' + label + ':'); console.log(execSync(cmd, { encoding: 'utf-8' }).split('\n').slice(0, 8).join('\n')); }
    catch (e) {
        const m = String(e.message || e);
        if (/EBUSY|locked|being used by another process/.test(m)) console.log('!! ' + label + ' failed: workbook is open (EBUSY). Close it and re-run the rebuild.');
        else console.log('!! ' + label + ' failed: ' + m.split('\n')[0]);
    }
};
run('rebuilding mou-extracted.xlsx', 'node D:/new-hope-erp/server/scripts/buildMouExtract.mjs');
run('rebuilding comparison workbook', 'node D:/new-hope-erp/server/scripts/buildMouVsOriginal.mjs');

// ---------- report ----------
console.log('\n=== dedupe report ===');
console.log('restored old-agreement dates:');
for (const s of report.restores) console.log(s);
console.log('\nremoved duplicates:', backup.length);
for (const s of report.removed) console.log(s);
