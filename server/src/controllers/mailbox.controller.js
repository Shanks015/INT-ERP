import MailboxConnection from '../models/MailboxConnection.js';
import { encrypt } from '../services/cryptoService.js';
import { syncMailbox } from '../jobs/imapReplySync.job.js';
import {
    isGmailConfigured,
    buildAuthUrl,
    buildRedirectUri,
    exchangeCodeForTokens,
    getUserEmail
} from '../services/gmailSendService.js';

// Admins manage every connection; any other role manages only their own.
const canManage = (connection, req) => {
    if (!connection) return false;
    if (req.user.role === 'admin') return true;
    return !!(connection.employee && String(connection.employee) === String(req.user._id));
};

// GET /api/mailboxes — list all connections (admin) or your own (any role)
export const getAllMailboxes = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const filter = isAdmin ? {} : { employee: req.user._id };

        const connections = await MailboxConnection.find(filter)
            .populate('employee', 'name email')
            .sort({ createdAt: -1 });

        // Never expose the encrypted password in responses
        const safe = connections.map(c => ({
            _id:          c._id,
            employee:     c.employee,
            employeeName: c.employeeName,
            emailAddress: c.emailAddress,
            imapHost:     c.imapHost,
            imapPort:     c.imapPort,
            status:       c.status,
            lastSyncAt:   c.lastSyncAt,
            lastErrorAt:  c.lastErrorAt,
            lastError:    c.lastError,
            totalMatched: c.totalMatched,
            gmailAuthorizedAt: c.gmailAuthorizedAt,
            createdAt:    c.createdAt
        }));

        res.json({ data: safe, gmailConfigured: isGmailConfigured() });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching mailbox connections', error: err.message });
    }
};

// POST /api/mailboxes — add a connection. Admins pick any employee; everyone
// else's connection is always tied to their own account.
export const createMailbox = async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const employeeId   = isAdmin ? req.body.employeeId : req.user._id;
        const employeeName = isAdmin ? req.body.employeeName : req.user.name;
        const { emailAddress, appPassword, imapHost, imapPort } = req.body;

        if (!employeeId || !employeeName || !emailAddress || !appPassword) {
            return res.status(400).json({ message: 'employeeId, employeeName, emailAddress and appPassword are required' });
        }

        // Check duplicate
        const existing = await MailboxConnection.findOne({ employee: employeeId });
        if (existing) {
            return res.status(409).json({ message: 'A mailbox connection already exists for this employee' });
        }

        // Clean app password (remove spaces Gmail adds for display)
        const cleanPassword = appPassword.replace(/\s/g, '');
        const encryptedPassword = encrypt(cleanPassword);

        const connection = await MailboxConnection.create({
            employee:    employeeId,
            employeeName,
            emailAddress: emailAddress.toLowerCase().trim(),
            appPassword: encryptedPassword,
            imapHost:    imapHost || 'imap.gmail.com',
            imapPort:    imapPort || 993
        });

        res.status(201).json({ message: 'Mailbox connection added successfully', data: { _id: connection._id, emailAddress: connection.emailAddress } });
    } catch (err) {
        res.status(500).json({ message: 'Error creating mailbox connection', error: err.message });
    }
};

// DELETE /api/mailboxes/:id — remove a connection you may manage
export const deleteMailbox = async (req, res) => {
    try {
        const connection = await MailboxConnection.findById(req.params.id);
        if (!connection) return res.status(404).json({ message: 'Connection not found' });
        if (!canManage(connection, req)) {
            return res.status(403).json({ message: 'Access denied. You can only remove your own mailbox connection.' });
        }
        await MailboxConnection.findByIdAndDelete(req.params.id);
        res.json({ message: 'Mailbox connection removed' });
    } catch (err) {
        res.status(500).json({ message: 'Error removing mailbox connection', error: err.message });
    }
};

// POST /api/mailboxes/:id/sync — manual sync trigger (own mailbox unless admin)
export const triggerSync = async (req, res) => {
    try {
        const connection = await MailboxConnection.findById(req.params.id);
        if (!connection) return res.status(404).json({ message: 'Connection not found' });
        if (!canManage(connection, req)) {
            return res.status(403).json({ message: 'Access denied. You can only sync your own mailbox connection.' });
        }

        res.json({ message: 'Sync started in background' });

        // Run async (don't await so response returns immediately)
        syncMailbox(connection).catch(err => {
            console.error('[Manual Sync] Error:', err.message);
        });
    } catch (err) {
        res.status(500).json({ message: 'Error triggering sync', error: err.message });
    }
};

// PUT /api/mailboxes/:id/status — activate or disconnect (own mailbox unless admin)
export const updateMailboxStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'disconnected'].includes(status)) {
            return res.status(400).json({ message: 'Status must be active or disconnected' });
        }

        const connection = await MailboxConnection.findById(req.params.id);
        if (!connection) return res.status(404).json({ message: 'Connection not found' });
        if (!canManage(connection, req)) {
            return res.status(403).json({ message: 'Access denied. You can only manage your own mailbox connection.' });
        }

        connection.status = status;
        await connection.save();
        res.json({ message: `Mailbox ${status}`, data: { _id: connection._id, status: connection.status } });
    } catch (err) {
        res.status(500).json({ message: 'Error updating mailbox status', error: err.message });
    }
};

// GET /api/mailboxes/gmail/auth-url?mailboxId=... — build the Google consent URL.
// The logged-in user (or admin) then opens it in the browser as the mailbox owner.
export const gmailAuthUrl = async (req, res) => {
    try {
        const { mailboxId } = req.query;
        if (!mailboxId) return res.status(400).json({ message: 'mailboxId is required' });
        if (!isGmailConfigured()) {
            return res.status(400).json({ message: 'Gmail API is not configured on this server yet (missing GOOGLE_CLIENT_SECRET)' });
        }

        const connection = await MailboxConnection.findById(mailboxId);
        if (!connection) return res.status(404).json({ message: 'Connection not found' });
        if (!canManage(connection, req)) {
            return res.status(403).json({ message: 'Access denied. You can only authorize your own mailbox connection.' });
        }

        const redirectUri = buildRedirectUri(req);
        const url = buildAuthUrl({ redirectUri, mailboxId: connection._id.toString() });
        res.json({ url });
    } catch (err) {
        res.status(500).json({ message: 'Error building Google auth URL', error: err.message });
    }
};

// GET /api/mailboxes/gmail/oauth/callback — Google redirects the browser here
// after consent. PUBLIC route (no ERP JWT present). Exchanges the code, verifies
// the authorized account is the mailbox's address, stores the refresh token.
export const gmailOauthCallback = async (req, res) => {
    const back = (msg) => res.redirect(`/mailbox-connections?gmail=error&msg=${encodeURIComponent(msg)}`);
    try {
        const { code, state, error } = req.query;
        if (error) return back('Authorization was cancelled or denied');
        if (!code) return back('Google returned no authorization code');

        let mailboxId = null;
        try { mailboxId = Buffer.from(String(state || ''), 'base64url').toString('utf8'); } catch {}
        if (!mailboxId) return back('Invalid authorization state');

        const connection = await MailboxConnection.findById(mailboxId);
        if (!connection) return back('Mailbox connection not found');

        const redirectUri = buildRedirectUri(req);
        const tokens = await exchangeCodeForTokens({ code, redirectUri });
        if (!tokens.refresh_token) return back('Google did not return a refresh token (offline access not granted)');

        // Verify the account that authorized is the one this mailbox is for.
        const authorizedEmail = await getUserEmail(tokens.access_token).catch(() => null);
        if (authorizedEmail && authorizedEmail.toLowerCase() !== connection.emailAddress.toLowerCase()) {
            return back(`Signed in as ${authorizedEmail}, but this mailbox is ${connection.emailAddress}`);
        }

        connection.refreshToken = encrypt(tokens.refresh_token);
        connection.gmailAuthorizedAt = new Date();
        await connection.save();

        res.redirect('/mailbox-connections?gmail=ok');
    } catch (err) {
        console.error('[Gmail OAuth callback error]', err);
        back('Authorization failed: ' + err.message);
    }
};
