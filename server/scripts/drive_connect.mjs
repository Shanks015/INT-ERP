// drive_connect.mjs — ONE-TIME setup that lets the ERP act as the office Google
// Drive account WITHOUT any in-app admin flow.
//
//  1. ONE Cloud Console step (30 s, done by whoever owns the OAuth client behind
//     GOOGLE_CLIENT_SECRET — the same client the mailboxes already use):
//     enable the Drive API (APIs & Services → Library → Google Drive API), and
//     add this exact Authorized redirect URI to that client:
//         http://localhost:5312/oauth2callback
//  2. Run:   cd server && node scripts/drive_connect.mjs
//  3. A browser tab opens Google's consent screen. Sign in as the OFFICE account
//     (the @dsu.edu address that owns the Drive folders / the future mail id) and
//     click Allow.
//  4. This script validates the token against the Drive API and prints a refresh
//     token. Paste it into the server config as GOOGLE_DRIVE_REFRESH_TOKEN
//     (local server/.env and Render). The ERP then stores every module file
//     under that office account, automatically.
//
// The helper exchanges the code with the SAME Google OAuth client the mailboxes
// use, so no ERP UI, no database write — the token is plain server config
// (driveService.getAccessToken reads it).
import 'dotenv/config';
import http from 'node:http';
import { exec } from 'node:child_process';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO = 'https://www.googleapis.com/oauth2/v2/userinfo';
const DRIVE_CHECK = 'https://www.googleapis.com/drive/v3/files?pageSize=1';

// Fixed port so the redirect URI above can be registered once in Cloud Console.
// (An ephemeral port could never be pre-registered — Google rejects it.)
const PORT = 5312;

// Drive + Sheets: the ERP reads/creates office folders AND writes the daily
// tabular backup through the Sheets API. userinfo.email only confirms WHICH
// account. Enable both Drive API and Sheets API in Cloud Console.
const SCOPE = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email';

const clientId = () => process.env.GOOGLE_CLIENT_ID || '795253947927-jbrdlu6s6djsj20d7190ktpqhivpf72r.apps.googleusercontent.com';
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || '';

const exchange = async (code, redirectUri) => {
    const body = new URLSearchParams({
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
    });
    const r = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error_description || j.error || 'token exchange failed') + ` (${r.status})`);
    return j; // { access_token, refresh_token, expires_in, ... }
};

const openBrowser = (url) => {
    const cmd = process.platform === 'win32' ? `start "" "${url}"`
        : process.platform === 'darwin' ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, () => {}); // best effort — the URL is also printed below
};

if (!clientSecret()) {
    console.error('GOOGLE_CLIENT_SECRET is not set. Load server/.env or export it, then re-run.');
    process.exit(1);
}

const redirectUri = `http://localhost:${PORT}/oauth2callback`;

const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'false'
});
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

console.log('One-time ERP Drive setup — sign in as the OFFICE account when the browser opens.');
console.log('\nBefore continuing, make sure Cloud Console has:');
console.log('  • the Drive API AND Sheets API enabled for this OAuth project, and');
console.log(`  • ${redirectUri} registered as an Authorized redirect URI on the client.`);
console.log('  (If Google shows "redirect_uri_mismatch" below, add that URI and re-run.)');
console.log('\nIf the browser does not open, paste this into it:\n' + authUrl + '\n');

// Bind the fixed port; refuse to run if something else holds it.
const server = http.createServer();
await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, resolve);
}).catch(() => {
    console.error(`Port ${PORT} is already in use. Free it (or edit PORT at the top of this script and re-register the matching redirect URI), then re-run.`);
    process.exit(1);
});

openBrowser(authUrl);

const result = await new Promise((resolve, reject) => {
    server.on('request', async (req, res) => {
        const url = new URL(req.url, redirectUri);
        if (url.pathname !== '/oauth2callback') { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        try {
            const code = url.searchParams.get('code');
            const err = url.searchParams.get('error');
            if (err || !code) throw new Error(err || 'Google returned no authorization code');
            const tokens = await exchange(code, redirectUri);
            if (!tokens.refresh_token) throw new Error('No refresh token returned — disconnect the app in Google and re-run with consent.');
            let email = '(unknown)';
            try {
                const u = await fetch(USERINFO + '?alt=json', { headers: { Authorization: 'Bearer ' + tokens.access_token } });
                const uj = await u.json();
                if (u.ok) email = uj.email;
            } catch { /* best effort */ }

            // Confirm the token can reach Drive AND Sheets before calling it done —
            // catches a disabled API / missing scope right here at setup.
            const d = await fetch(DRIVE_CHECK, { headers: { Authorization: 'Bearer ' + tokens.access_token } });
            if (!d.ok) {
                const dj = await d.json().catch(() => ({}));
                throw new Error('Drive API check failed (' + d.status + '): ' + (dj.error?.message || 'enable the Google Drive API for this OAuth project.'));
            }
            const s = await fetch('https://sheets.googleapis.com/v4/spreadsheets', { method: 'POST', headers: { Authorization: 'Bearer ' + tokens.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: { title: '__scope_probe__' } }) });
            // 200 = created; 403/401 = missing sheets scope. Delete the probe if created.
            if (s.ok) {
                const sj = await s.json().catch(() => ({}));
                if (sj.spreadsheetId) {
                    await fetch('https://www.googleapis.com/drive/v3/files/' + sj.spreadsheetId, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tokens.access_token } });
                }
            } else if (s.status === 403 || s.status === 401) {
                const sj = await s.json().catch(() => ({}));
                throw new Error('Sheets API scope missing (' + s.status + '): ' + (sj.error?.message || 'enable the Google Sheets API and re-consent.'));
            }

            res.end(`<h3>ERP Drive authorized as <b style="color:green">${email}</b></h3><p>Drive + Sheets APIs reachable. You can close this tab.</p>`);
            resolve({ refreshToken: tokens.refresh_token, email });
        } catch (e) {
            res.end(`<h3 style="color:red">Authorization failed: ${e.message}</h3><p>You can close this tab and retry.</p>`);
            reject(e);
        }
    });
});

server.close();

console.log(`\nAuthorized Google account: ${result.email}`);
console.log('\nPaste this value into server config as GOOGLE_DRIVE_REFRESH_TOKEN:\n');
console.log(result.refreshToken + '\n');
console.log('(server/.env for local dev, and the Render environment for the live site.)');
