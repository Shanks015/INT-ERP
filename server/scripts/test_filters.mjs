// test_filters.mjs — end-to-end filter tests for Student Exchange + Immersion Programs.
// Hits the LIVE API (localhost:5000) with an admin token and asserts the returned doc
// set matches expectations computed from ground truth with the same semantics as
// generic.controller.js getAll() (search $or-substring, country substring, other filters
// case-insensitive exact, date range overlap / arrivalDeparture).
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import User from '../src/models/User.js';
import StudentExchange from '../src/models/StudentExchange.js';
import ImmersionProgram from '../src/models/ImmersionProgram.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API = 'http://localhost:5000/api';

// Searchable fields, in the same order/contents as generic.controller.js getAll()
const SEARCH_FIELDS = ['name','title','university','universityName','exchangeUniversity','visitorName','scholarName','designation','studentName','conferenceName','contactName','country','department','partnerName','programName','organizationName','channel','email','mobile'];

let pass = 0, fail = 0;
const failures = [];
const report = (label, ok, extra = '') => {
    if (ok) { pass++; console.log(`  PASS  ${label}`); }
    else { fail++; failures.push(label); console.log(`  FAIL  ${label}${extra ? ' — ' + extra : ''}`); }
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- Server-semantics predictors (mirror getAll) ---
const predSearch = (doc, term) => SEARCH_FIELDS.some((f) => String(doc[f] ?? '').toLowerCase().includes(term.toLowerCase()));
const predCountry = (doc, val) => String(doc.country ?? '').toLowerCase().includes(val.toLowerCase());
const predExact = (doc, key, val) => String(doc[key] ?? '').toLowerCase() === String(val).toLowerCase();
// Exchange: fromDate/toDate range OVERLAP
const predExchangeRange = (doc, sd, ed) => {
    if (sd && (!doc.toDate || doc.toDate.getTime() < new Date(sd).getTime())) return false;
    if (ed) {
        const end = new Date(ed); end.setHours(23, 59, 59, 999);
        if (!doc.fromDate || doc.fromDate.getTime() > end.getTime()) return false;
    }
    return true;
};
// Immersion: departureDate >= start; arrivalDate <= end (arrivalDeparture config)
const predImmersionRange = (doc, sd, ed) => {
    if (sd && (!doc.departureDate || doc.departureDate.getTime() < new Date(sd).getTime())) return false;
    if (ed) {
        const end = new Date(ed); end.setHours(23, 59, 59, 999);
        if (!doc.arrivalDate || doc.arrivalDate.getTime() > end.getTime()) return false;
    }
    return true;
};

const filterById = (docs, fn) => docs.filter(fn).map((d) => String(d._id)).sort();

const runCase = async (basePath, params, expectedIds) => {
    const qs = new URLSearchParams({ page: 1, limit: 1000, ...params });
    const res = await fetch(`${API}${basePath}?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return { http: res.status, err: body.message || body.error, got: null };
    const got = body.data.map((d) => String(d._id)).sort();
    return { http: res.status, got, total: body.pagination?.total };
};

const main = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const admin = await User.findOne({ email: 'admin@dsu.edu.in' }) || await User.findOne({ role: 'admin' });
    token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30m' });
    console.log('Admin:', admin.email);

    const exs = await StudentExchange.find().lean();
    const ims = await ImmersionProgram.find().lean();
    console.log(`\nGround truth: StudentExchange=${exs.length}, ImmersionProgram=${ims.length}`);

    // ============ STUDENT EXCHANGE ============
    console.log('\n=== Student Exchange filters ===');
    const exNames = [...new Set(exs.map((d) => d.exchangeUniversity || d.studentName).filter(Boolean))];
    const exStatuses = [...new Set(exs.map((d) => d.exchangeStatus).filter(Boolean))];
    const exCountries = [...new Set(exs.map((d) => d.country).filter(Boolean))];
    const exDirections = [...new Set(exs.map((d) => d.direction).filter(Boolean))];

    // direction
    if (exDirections.length) {
        const v = exDirections[0];
        const exp = filterById(exs, (d) => predExact(d, 'direction', v));
        const r = await runCase('/student-exchange', { direction: v }, exp);
        report(`direction="${v}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    // exchangeStatus
    if (exStatuses.length) {
        const v = exStatuses[0];
        const exp = filterById(exs, (d) => predExact(d, 'exchangeStatus', v));
        const r = await runCase('/student-exchange', { exchangeStatus: v }, exp);
        report(`exchangeStatus="${v}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    // country
    if (exCountries.length) {
        const v = exCountries[0];
        const exp = filterById(exs, (d) => predCountry(d, v));
        const r = await runCase('/student-exchange', { country: v }, exp);
        report(`country="${v}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    // recordStatus active
    {
        const exp = filterById(exs, (d) => predExact(d, 'recordStatus', 'active'));
        const r = await runCase('/student-exchange', { recordStatus: 'active' }, exp);
        report(`recordStatus="active" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    // search over a real name
    if (exNames.length) {
        const full = exNames[0];
        const term = full.slice(0, Math.min(6, full.length));
        const exp = filterById(exs, (d) => predSearch(d, term));
        const r = await runCase('/student-exchange', { search: term }, exp);
        report(`search="${term}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    // date range overlap: pick first doc with both dates
    {
        const d0 = exs.find((d) => d.fromDate && d.toDate);
        if (d0) {
            const sd = new Date(d0.fromDate.getTime() - 3 * 86400000).toISOString().slice(0, 10);
            const ed = new Date(d0.toDate.getTime() + 3 * 86400000).toISOString().slice(0, 10);
            const exp = filterById(exs, (d) => predExchangeRange(d, sd, ed));
            const r = await runCase('/student-exchange', { startDate: sd, endDate: ed }, exp);
            report(`range ${sd}..${ed} (overlap) -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
        }
    }
    // combo: direction + status + country
    if (exDirections.length && exStatuses.length && exCountries.length) {
        const dir = exDirections[0], st = exStatuses[0], cu = exCountries[0];
        const exp = filterById(exs, (d) => predExact(d, 'direction', dir) && predExact(d, 'exchangeStatus', st) && predCountry(d, cu));
        const r = await runCase('/student-exchange', { direction: dir, exchangeStatus: st, country: cu }, exp);
        report(`combo dir+status+country -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    // empty result
    {
        const exp = [];
        const r = await runCase('/student-exchange', { search: 'zzzqqq_nomatch' }, exp);
        report('search gibberish -> 0', r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp 0`);
    }

    // ============ IMMERSION PROGRAMS ============
    console.log('\n=== Immersion Program filters ===');
    const imUnis = [...new Set(ims.map((d) => d.university).filter(Boolean))];
    const imStatuses = [...new Set(ims.map((d) => d.programStatus).filter(Boolean))];
    const imDepts = [...new Set(ims.map((d) => d.department).filter(Boolean))];
    const imCountries = [...new Set(ims.map((d) => d.country).filter(Boolean))];
    const imDirections = [...new Set(ims.map((d) => d.direction).filter(Boolean))];

    if (imDirections.length) {
        const v = imDirections[0];
        const exp = filterById(ims, (d) => predExact(d, 'direction', v));
        const r = await runCase('/immersion-programs', { direction: v }, exp);
        report(`direction="${v}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    if (imStatuses.length) {
        const v = imStatuses[0];
        const exp = filterById(ims, (d) => predExact(d, 'programStatus', v));
        const r = await runCase('/immersion-programs', { programStatus: v }, exp);
        report(`programStatus="${v}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    if (imDepts.length) {
        const v = imDepts[0];
        const exp = filterById(ims, (d) => predExact(d, 'department', v));
        const r = await runCase('/immersion-programs', { department: v }, exp);
        report(`department="${v}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    if (imCountries.length) {
        const v = imCountries[0];
        const exp = filterById(ims, (d) => predCountry(d, v));
        const r = await runCase('/immersion-programs', { country: v }, exp);
        report(`country="${v}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    {
        const exp = filterById(ims, (d) => predExact(d, 'recordStatus', 'active'));
        const r = await runCase('/immersion-programs', { recordStatus: 'active' }, exp);
        report(`recordStatus="active" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    if (imUnis.length) {
        const full = imUnis[0];
        const term = full.slice(0, Math.min(6, full.length));
        const exp = filterById(ims, (d) => predSearch(d, term));
        const r = await runCase('/immersion-programs', { search: term }, exp);
        report(`search="${term}" -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    {
        const d0 = ims.find((d) => d.arrivalDate && d.departureDate);
        if (d0) {
            const sd = new Date(d0.arrivalDate.getTime() - 3 * 86400000).toISOString().slice(0, 10);
            const ed = new Date(d0.departureDate.getTime() + 3 * 86400000).toISOString().slice(0, 10);
            const exp = filterById(ims, (d) => predImmersionRange(d, sd, ed));
            const r = await runCase('/immersion-programs', { startDate: sd, endDate: ed }, exp);
            report(`range ${sd}..${ed} (departure/arrival) -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
        }
    }
    if (imDirections.length && imStatuses.length) {
        const dir = imDirections[0], st = imStatuses[0];
        const exp = filterById(ims, (d) => predExact(d, 'direction', dir) && predExact(d, 'programStatus', st));
        const r = await runCase('/immersion-programs', { direction: dir, programStatus: st }, exp);
        report(`combo dir+programStatus -> ${exp.length}`, r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp ${exp.length}`);
    }
    {
        const exp = [];
        const r = await runCase('/immersion-programs', { search: 'zzzqqq_nomatch' }, exp);
        report('search gibberish -> 0', r.got && JSON.stringify(r.got) === JSON.stringify(exp), `got ${r.got?.length} exp 0`);
    }

    console.log(`\n==== RESULT: ${pass} passed, ${fail} failed ====`);
    if (failures.length) { console.log('Failures:'); failures.forEach((f) => console.log('  - ' + f)); }

    await mongoose.disconnect();
    process.exit(fail ? 1 : 0);
};
let token;
main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
