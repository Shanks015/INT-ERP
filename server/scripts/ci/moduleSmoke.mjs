// Read-only live module smoke for the "test every module" CD check
// (.github/workflows/verify-live.yml). Logs in as an admin against the deployed
// app and GETs each module's list endpoint (limit=3) asserting the documented
// { success, data:[…], pagination:{total} } shape; /stats is probed but optional
// (not every mount exposes it). NO writes — this never mutates shared Atlas.
//
// Config via env (secrets in CI, overridable locally):
//   LIVE_BASE       default https://int-erp.onrender.com/api
//   ADMIN_EMAIL     default admin@dsu.edu
//   ADMIN_PASSWORD  required
//
// Exit 0 when every module list passes; non-zero otherwise (prints a table).
const BASE = (process.env.LIVE_BASE || 'https://int-erp.onrender.com/api').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@dsu.edu';
const PASSWORD = process.env.ADMIN_PASSWORD;

// The module mounts from server/src/server.js. Keep in sync when a module ships.
const MODULES = [
    'partners',
    'campus-visits',
    'seminars',
    'consultant-visits',
    'events',
    'mou-signing-ceremonies',
    'conferences',
    'scholars-in-residence',
    'mou-updates',
    'immersion-programs',
    'student-exchange',
    'masters-abroad',
    'memberships',
    'digital-media',
    'social-media',
    'outreach',
    'meeting-trackers',
    'outreach-new'
];

const login = async () => {
    const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });
    const body = await res.json();
    if (!res.ok || !body.token) {
        throw new Error(`login failed (HTTP ${res.status}): ${body.message || JSON.stringify(body).slice(0, 200)}`);
    }
    return { Authorization: `Bearer ${body.token}` };
};

const totalOf = (body) => {
    const t = body?.stats?.total ?? body?.data?.total ?? body?.pagination?.total ?? body?.total;
    return Number.isFinite(Number(t)) ? Number(t) : null;
};

const probeModule = async (headers, slug) => {
    const out = { slug, list: null, stats: null, error: null };

    const listRes = await fetch(`${BASE}/${slug}?limit=3`, { headers });
    let body = {};
    try { body = await listRes.json(); } catch { /* non-JSON */ }

    out.list = {
        ok: listRes.ok && body.success === true && Array.isArray(body.data),
        http: listRes.status,
        data: Array.isArray(body.data) ? body.data.length : -1,
        total: body.pagination && Number.isFinite(Number(body.pagination.total)) ? Number(body.pagination.total) : null
    };

    // /stats is advisory: skip cleanly on 404/405, fail on a 5xx or auth error.
    try {
        const sRes = await fetch(`${BASE}/${slug}/stats`, { headers });
        const sBody = await sRes.json();
        out.stats = {
            http: sRes.status,
            total: totalOf(sBody)
        };
    } catch (e) {
        out.stats = { http: 'err', total: null };
    }

    return out;
};

const main = async () => {
    if (!PASSWORD) {
        console.error('ADMIN_PASSWORD env var is required (set ADMIN_EMAIL too if not admin@dsu.edu).');
        process.exit(2);
    }

    let headers;
    try {
        headers = await login();
        console.log(`login ok as ${EMAIL} @ ${BASE}`);
    } catch (e) {
        console.error(String(e.message));
        process.exit(1);
    }

    const results = await Promise.all(MODULES.map((slug) => probeModule(headers, slug)));

    let failed = 0;
    for (const r of results) {
        const list = r.list;
        const listOk = list && list.ok;
        const stats = r.stats;
        const statsBad = stats && stats.http >= 500;
        const bad = !listOk || statsBad;
        if (bad) failed++;
        console.log(
            `${bad ? 'FAIL' : 'ok  '}  ${r.slug.padEnd(24)} ` +
            `list http=${list?.http ?? '-'} data=${list?.data ?? '-'} total=${list?.total ?? '-'} ` +
            `stats http=${stats?.http ?? '-'} total=${stats?.total ?? '-'}`
        );
    }

    if (failed > 0) {
        console.error(`\n${failed}/${MODULES.length} module(s) FAILED — check the list shape assertions above.`);
        process.exit(1);
    }
    console.log(`\nAll ${MODULES.length} module list endpoints passed.`);
};

main().catch((e) => {
    console.error('smoke crashed:', e.message);
    process.exit(1);
});
