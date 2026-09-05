// gmailSendService.js — the SEND leg for mailboxes authorized with Google.
//
// Render's egress drops outbound TCP to Gmail's SMTP ports (465 and 587 both
// time out) even though IMAP on 993 and general HTTPS work. So when a mailbox
// holds a Google OAuth refresh token, the ERP sends through the Gmail API over
// HTTPS instead of nodemailer/SMTP. No extra dependencies: token exchange,
// token refresh and users.messages.send all ride on Node's global fetch.
import fs from 'fs';
import { decrypt } from './cryptoService.js';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SEND_ENDPOINT  = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const MSG_ENDPOINT   = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
const USERINFO       = 'https://www.googleapis.com/oauth2/v2/userinfo';
// gmail.send = deliver as the authorized account; userinfo.email = confirm WHICH
// account authorized so a token is never stored against the wrong mailbox.
const SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

const DEFAULT_CLIENT_ID = '795253947927-jbrdlu6s6djsj20d7190ktpqhivpf72r.apps.googleusercontent.com';

export const clientId = () => process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
export const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || '';
export const isGmailConfigured = () => !!(clientId() && clientSecret());

// Must exactly match the "Authorized redirect URI" registered on the OAuth
// client in Google Cloud (https://int-erp.onrender.com/api/mailboxes/gmail/oauth/callback).
export const buildRedirectUri = (req) =>
    `${req.protocol}://${req.get('host')}/api/mailboxes/gmail/oauth/callback`;

export const buildAuthUrl = ({ redirectUri, mailboxId }) => {
    const p = new URLSearchParams({
        client_id: clientId(),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        state: Buffer.from(String(mailboxId)).toString('base64url'),
        include_granted_scopes: 'true'
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
};

export const exchangeCodeForTokens = async ({ code, redirectUri }) => {
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
    return j; // { access_token, refresh_token, expires_in, scope, token_type }
};

export const refreshAccessToken = async (refreshToken) => {
    const body = new URLSearchParams({
        client_id: clientId(),
        client_secret: clientSecret(),
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
    });
    const r = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error_description || j.error || 'token refresh failed') + ` (${r.status})`);
    return j.access_token;
};

export const getUserEmail = async (accessToken) => {
    const r = await fetch(USERINFO + '?alt=json', { headers: { Authorization: 'Bearer ' + accessToken } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error?.message || 'userinfo failed') + ` (${r.status})`);
    return j.email;
};

// RFC 2047 encoding for a header value that contains non-ASCII characters.
const encodeHeader = (value) => /[^\x20-\x7E]/.test(value)
    ? '=?UTF-8?B?' + Buffer.from(value, 'utf8').toString('base64') + '?='
    : value;

const foldBase64 = (b64) => {
    const out = [];
    for (let i = 0; i < b64.length; i += 76) out.push(b64.slice(i, i + 76));
    return out.join('\r\n');
};

// Wrap a raw Message-ID in angle brackets (RFC 5322 form for In-Reply-To/
// References) if it is not already bracketed.
const toHeaderId = (value) => {
    const s = String(value).trim();
    return s ? (/^<.*>$/.test(s) ? s : `<${s}>`) : null;
};

// Build a base64url RFC-822 message. HTML body and any attachments are base64
// encoded (robust for arbitrary UTF-8, no quoted-printable edge cases). No
// attachments -> single text/html part; otherwise multipart/mixed.
//
// When this message continues an existing conversation (a reply), pass the
// parent's RFC Message-ID as `inReplyTo` so Gmail folds the send into the same
// thread via In-Reply-To/References instead of opening a new conversation.
// `references` is optional — when omitted and inReplyTo is set, References is
// seeded with the parent id (we do not persist full ancestry chains).
// Exported for unit tests (see tests/gmailSendService.test.js).
export const buildRawMessage = ({ fromName, from, to, subject, html, attachments, inReplyTo, references }) => {
    const boundary = '----=_int_erp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const CRLF = '\r\n';
    const lines = [];
    const fromHeader = fromName ? `"${String(fromName).replace(/"/g, "'")}" <${from}>` : `<${from}>`;
    lines.push(`From: ${fromHeader}`);
    lines.push(`To: ${to}`);
    lines.push(`Subject: ${encodeHeader(String(subject))}`);
    lines.push('MIME-Version: 1.0');
    lines.push('Auto-Submitted: auto-generated');

    const parentId = inReplyTo ? toHeaderId(inReplyTo) : null;
    if (parentId) lines.push(`In-Reply-To: ${parentId}`);
    const refs = [];
    if (references) {
        for (const r of [].concat(references)) {
            const h = toHeaderId(r);
            if (h && !refs.includes(h)) refs.push(h);
        }
    }
    // RFC 5322 wants the immediate parent last in References; if an explicit
    // chain was supplied without it (or none was supplied at all), append it.
    if (parentId && !refs.includes(parentId)) refs.push(parentId);
    if (refs.length) lines.push(`References: ${refs.join(' ')}`);

    const htmlPart = (wrapBoundary) => {
        const p = [];
        if (wrapBoundary) p.push(`--${wrapBoundary}`);
        p.push('Content-Type: text/html; charset="UTF-8"');
        p.push('Content-Transfer-Encoding: base64');
        p.push('');
        p.push(foldBase64(Buffer.from(html, 'utf8').toString('base64')));
        return p;
    };

    if (!attachments || attachments.length === 0) {
        lines.push(...htmlPart(null));
    } else {
        lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        lines.push('');
        lines.push(...htmlPart(boundary));
        for (const a of attachments) {
            let buf;
            try { buf = a.path ? fs.readFileSync(a.path) : Buffer.from(a.content || ''); }
            catch { continue; } // unreadable attachment -> skip rather than fail the send
            const filename = String(a.filename || 'file').replace(/"/g, "'");
            lines.push('');
            lines.push(`--${boundary}`);
            lines.push(`Content-Type: ${a.contentType || 'application/octet-stream'}`);
            lines.push('Content-Transfer-Encoding: base64');
            lines.push(`Content-Disposition: attachment; filename="${encodeHeader(filename)}"`);
            lines.push('');
            lines.push(foldBase64(buf.toString('base64')));
        }
        lines.push('');
        lines.push(`--${boundary}--`);
    }

    return Buffer.from(lines.join(CRLF), 'utf8').toString('base64url');
};

// Send an email as the mailbox's Google account. Returns the Gmail internal id,
// thread id, and (fetched back) the real RFC Message-ID header.
//
// To thread onto an existing conversation pass the parent's RFC Message-ID as
// `inReplyTo` (buildRawMessage turns it into In-Reply-To/References) and, when
// known, that conversation's Gmail `threadId`. Gmail only folds a send into an
// existing thread when BOTH the request-body threadId AND the message headers
// agree, so we always supply both. Omit both for a first-contact send (fresh thread).
export const sendViaGmail = async ({ mailbox, fromName, from, to, subject, html, attachments, inReplyTo, threadId }) => {
    if (!isGmailConfigured()) throw new Error('Gmail API is not configured on this server (missing GOOGLE_CLIENT_SECRET)');
    if (!mailbox.refreshToken) throw new Error('Mailbox has no Google refresh token');
    const accessToken = await refreshAccessToken(decrypt(mailbox.refreshToken));
    const raw = buildRawMessage({ fromName, from, to, subject, html, attachments, inReplyTo });
    const body = { raw };
    if (threadId) body.threadId = threadId;
    const r = await fetch(SEND_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
        const reason = j.error?.message || j.error?.code || 'unknown';
        if (j.error?.code === 401) {
            throw new Error('Google authorization expired. Re-authorize this mailbox on the Mailbox page. (' + reason + ')');
        }
        throw new Error('Gmail send failed: ' + reason + ` (${r.status})`);
    }
    const gmailId = j.id;
    // Fetch the server-assigned RFC Message-ID back so the logged thread entry is
    // accurate and future In-Reply-To matching has a real value.
    let rfcMessageId = null;
    try {
        const m = await fetch(`${MSG_ENDPOINT}/${gmailId}?format=metadata&metadataHeaders=Message-ID`, {
            headers: { Authorization: 'Bearer ' + accessToken }
        });
        const mj = await m.json();
        const h = (mj.payload?.headers || []).find((x) => (x.name || '').toLowerCase() === 'message-id');
        rfcMessageId = h?.value || null;
    } catch { /* best effort — fall back to the Gmail id below */ }
    return { gmailId, threadId: j.threadId || null, messageId: rfcMessageId || gmailId };
};
