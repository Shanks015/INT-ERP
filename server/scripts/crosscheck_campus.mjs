// crosscheck_campus.mjs — READ-ONLY.
// 1. Decode every workbook date (serial + text) to an ISO date via the SAME parseDate
//    logic import.controller uses, and print the decoded table for sanity.
// 2. Fingerprint live CampusVisit docs and workbook rows; report live docs not matched
//    to any workbook row (would be lost on a wipe+reimport) and per-type counts.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import CampusVisit from '../src/models/CampusVisit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const file = 'C:\\Users\\saish\\Downloads\\FResh Campus visits.xlsx';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
const header = rows[0];
const data = rows.slice(1).filter((r) => r.slice(0, 8).some((c) => c !== null && String(c).trim() !== ''));

// Replicate import.controller's parseDate by requiring the controller? It imports many models
// (side effects). Instead replicate the known algorithm: serial via epoch, text dd/mm/yy(yy).
const parseDate = (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    if (typeof v === 'number') {
        // Excel 1900 serial (incl. the leap bug). 1899-12-30 + serial days.
        const ms = Math.round((v - 25569) * 86400000); // 25569 = serial of 1970-01-01
        return new Date(ms);
    }
    const s = String(v).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})/);
    if (m) {
        const [_, dd, mm, yy] = m;
        let y = Number(yy);
        if (yy.length === 2) y += (y <= 50 ? 2000 : 1900); // conservative: 21/11/25 -> 2025
        const d = new Date(Date.UTC(y, Number(mm) - 1, Number(dd)));
        return d;
    }
    const d = new Date(s);
    return isNaN(d) ? null : d;
};

const iso = (d) => (d ? d.toISOString().slice(0, 10) : null);

// Which column is the date
const dateCol = 0;
console.log('--- Workbook decoded dates (row#, type, iso) ---');
const wbRows = data.map((r, idx) => {
    const date = parseDate(r[dateCol]);
    const type = String(r[1] ?? '').trim();
    const visitor = String(r[2] ?? '').trim();
    const univ = String(r[4] ?? '').trim();
    if (idx < 25 || ['Other', 'Corporate Collaboration', 'Consultant Visit'].includes(type)) {
        console.log(`#${idx + 2}\t${type}\t${iso(date)}\t(raw=${String(r[0])})\t${visitor.slice(0, 40)} | ${univ.slice(0, 40)}`);
    }
    return { date, type, visitor, univ };
});

// Count per type
const typeCount = {};
for (const w of wbRows) typeCount[w.type] = (typeCount[w.type] || 0) + 1;
console.log('\nWorkbook real-row count by type:', JSON.stringify(typeCount));

// Normalize a string for fuzzy matching (lowercase, collapse spaces, drop punctuation oddities)
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const main = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const live = await CampusVisit.find().lean();
    console.log(`\nLive CampusVisit docs: ${live.length}`);

    let matched = 0; const unmatched = [];
    for (const doc of live) {
        const dv = norm(doc.visitorName);
        // find a workbook row sharing type + a normalized token overlap of at least the visitor's
        // longest token (>=6 chars) OR full visitor match OR date+univ match
        const hit = wbRows.some((w) => {
            if (w.type !== (doc.type || '')) return false;
            const sameDate = w.date && doc.date && iso(w.date) === iso(doc.date);
            const visitorTok = w.visitor.split(/[,]/).map((t) => t.trim()).filter(Boolean).find((t) => {
                const n = norm(t);
                return n.length >= 6 && dv.includes(n.slice(0, 20));
            });
            const univMatch = w.univ && norm(w.univ) === norm(doc.universityName);
            return !!visitorTok || (sameDate && univMatch);
        });
        if (hit) matched++;
        else unmatched.push(`type=${doc.type} | visitor=${(doc.visitorName||'').slice(0,60)} | univ=${(doc.universityName||'').slice(0,40)} | date=${iso(doc.date)}`);
    }
    console.log(`Live docs matched to a workbook row: ${matched}`);
    console.log(`Live docs NOT matched (would be lost on wipe): ${unmatched.length}`);
    unmatched.forEach((u) => console.log('  - ' + u));

    await mongoose.disconnect();
    process.exit(0);
};
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
