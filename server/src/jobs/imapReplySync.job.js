import cron from 'node-cron';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import MailboxConnection from '../models/MailboxConnection.js';
import Outreach from '../models/Outreach.js';
import OutreachNew from '../models/OutreachNew.js';
import ActivityLog from '../models/ActivityLog.js';
import { decrypt } from '../services/cryptoService.js';
import { sendEmail } from '../services/emailService.js';
import { buildAdminNotificationEmail } from '../services/outreachEmailTemplate.js';
import { emitToUser, emitToAdmins } from '../services/notificationService.js';
import { resolveSentMailboxPath, alreadyHasMessageId, reconciledStatus, sentReconcileEnabled } from '../utils/outreachSentSync.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ─── Shared mail parsing (INBOX + SENT passes) ────────────────────────────────
// Parse a full RFC822 source into a truncated plain-text body plus attachments
// written under uploads/attachments (referenced by their public path). Extracted
// here so the SENT reconcile pass behaves identically to the INBOX pass.
const parseSource = async (source) => {
    if (!source) return { body: null, attachments: [] };
    try {
        const parsed = await simpleParser(source);
        const rawBody = parsed.text || parsed.html?.replace(/<[^>]*>/g, ' ') || '';
        const body = rawBody.trim().slice(0, 10000) || null;

        const attachments = [];
        if (parsed.attachments && parsed.attachments.length > 0) {
            const attachmentsDir = path.join(__dirname, '../../uploads/attachments');
            if (!fs.existsSync(attachmentsDir)) {
                fs.mkdirSync(attachmentsDir, { recursive: true });
            }

            for (const att of parsed.attachments) {
                try {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    const cleanFileName = (att.filename || 'attachment')
                        .replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const safeFilename = `${uniqueSuffix}-${cleanFileName}`;
                    fs.writeFileSync(path.join(attachmentsDir, safeFilename), att.content);

                    attachments.push({
                        filename: att.filename || 'file',
                        contentType: att.contentType || 'application/octet-stream',
                        path: `/uploads/attachments/${safeFilename}`
                    });
                } catch (attErr) {
                    console.error('[IMAP] Failed to save attachment:', attErr.message);
                }
            }
        }
        return { body, attachments };
    } catch (parseErr) {
        console.warn('[IMAP] Body parse failed:', parseErr.message);
        return { body: null, attachments: [] };
    }
};


// ─── Core sync function for a single mailbox ─────────────────────────────────
export const syncMailbox = async (connection) => {
    let appPassword;
    try {
        appPassword = decrypt(connection.appPassword);
    } catch (err) {
        console.error(`[IMAP] Decryption failed for ${connection.emailAddress}:`, err.message);
        // Break notification only on a healthy → error transition, so a mailbox
        // that keeps failing (error again next poll) does not spam its owner.
        const wasError = connection.status === 'error';
        connection.status = 'error';
        connection.lastError = 'Failed to decrypt app password';
        connection.lastErrorAt = new Date();
        await connection.save();

        if (!wasError) {
            await emitToUser({
                recipientId: connection.employee,
                category: 'status',
                title: 'Mailbox connection broken',
                body: `Mailbox ${connection.emailAddress} stopped syncing (could not decrypt its app password). Check the connection settings.`,
                module: 'Mailboxes',
                link: '/mailbox-connections'
            });
        }
        return;
    }

    const client = new ImapFlow({
        host: connection.imapHost || 'imap.gmail.com',
        port: connection.imapPort || 993,
        secure: true,
        auth: {
            user: connection.emailAddress,
            pass: appPassword
        },
        logger: false
    });

    try {
        await client.connect();

        // Shared sync window. Pass 1 (INBOX partner replies) and Pass 2 (SENT
        // reconcile, below) both scan messages since this same point, and
        // connection.lastSyncAt only advances once BOTH have succeeded — see the
        // tail after Pass 2.
        const since = connection.lastSyncAt
            ? new Date(connection.lastSyncAt)
            : new Date(Date.now() - 48 * 60 * 60 * 1000);

        let inboxMatched = 0;
        let sentMatched = 0;

        // ── Pass 1: INBOX — partner replies ──────────────────────────────
        const lock = await client.getMailboxLock('INBOX');

        try {
            // ── Collect messages first (ImapFlow deadlock prevention) ─────────
            // ImapFlow forbids issuing IMAP commands inside a for-await loop;
            // we buffer all raw sources here, then process them afterward.
            const rawMessages = [];
            for await (const msg of client.fetch(
                { since },
                { envelope: true, source: true }
            )) {
                rawMessages.push({
                    envelope:  msg.envelope,
                    source:    msg.source   // Buffer — full RFC822 source
                });
            }

            for (const msg of rawMessages) {
                const fromEmail = msg.envelope?.from?.[0]?.address?.toLowerCase()?.trim();
                if (!fromEmail) continue;

                const messageId = msg.envelope?.messageId || null;

                // Skip if we've already processed this exact message in either model
                if (messageId) {
                    const alreadyLogged = await Outreach.exists({
                        $or: [
                            { replyMessageId: messageId },
                            { 'detectedReplies.messageId': messageId }
                        ]
                    });
                    const alreadyLoggedNew = await OutreachNew.exists({
                        'emails.messageId': messageId
                    });
                    if (alreadyLogged || alreadyLoggedNew) continue;
                }

                const cleanFrom = fromEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Find a matching outreach record (not closed)
                const outreach = await Outreach.findOne({
                    $or: [
                        { email: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } },
                        { alternativeEmails: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } }
                    ],
                    outreachStatus: { $ne: 'Closed' }
                });

                const outreachNew = await OutreachNew.findOne({
                    $or: [
                        { email: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } },
                        { alternativeEmails: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } }
                    ],
                    outreachStatus: { $ne: 'Closed' }
                });

                if (!outreach && !outreachNew) continue;

                // ── Parse the email body and attachments ──────────────────────
                const { body: replyBodyContent, attachments } = await parseSource(msg.source);

                if (outreachNew) {
                    // Log received email in the thread
                    outreachNew.emails.push({
                        messageId,
                        direction: 'received',
                        from: fromEmail,
                        to: connection.emailAddress,
                        subject: msg.envelope?.subject || '(No Subject)',
                        body: replyBodyContent || '',
                        sentAt: msg.envelope?.date || new Date(),
                        attachments: attachments
                    });

                    outreachNew.outreachStatus = 'Reply Received';
                    outreachNew.hasUnreadReply = true;
                    await outreachNew.save();
                    inboxMatched++;

                    console.log(`[IMAP] Reply detected for Outreach New: ${fromEmail} → ${outreachNew._id}`);

                    // Notify the mailbox owner of the new partner reply (in-app bell).
                    // Never throws.
                    await emitToUser({
                        recipientId: connection.employee,
                        category: 'reply',
                        title: 'New reply on Outreach Mail',
                        body: `${outreachNew.university || outreachNew.name || 'A partner'} replied on a thread in your mailbox ${connection.emailAddress}.`,
                        module: 'Outreach Mail',
                        link: '/outreach-new'
                    });

                    // Log to ActivityLog
                    await ActivityLog.logActivity({
                        user:       connection.employee,
                        userName:   connection.employeeName,
                        action:     'sync',
                        module:     'outreach-new',
                        targetId:   String(outreachNew._id),
                        targetName: outreachNew.university,
                        details:    { fromEmail, syncSource: 'imap_poll', messageId },
                        method:     'POST',
                        path:       '/jobs/imapReplySync',
                        statusCode: 200
                    });
                }
                if (outreach) {
                    // ── Construct and Push Reply to Array ─────────────────────────
                    const newReply = {
                        detectedAt: msg.envelope?.date || new Date(),
                        fromEmail: fromEmail,
                        subject: msg.envelope?.subject || '(No Subject)',
                        messageId: messageId,
                        bodyContent: replyBodyContent,
                        matchConfidence: 'high',
                        reviewStatus: 'pending_review',
                        detectedIn: connection.employee,
                        attachments: attachments
                    };

                    if (!outreach.detectedReplies) {
                        outreach.detectedReplies = [];
                    }
                    outreach.detectedReplies.push(newReply);

                    // ── Two-step: set to "Reply Detected", not "Replied" ──────────
                    outreach.outreachStatus = 'Reply Detected';
                    outreach.automationActive = false; // suspend reminders immediately
                    outreach.replyDetectedAt = newReply.detectedAt;
                    outreach.replyFromEmail = newReply.fromEmail;
                    outreach.replySubject = newReply.subject;
                    outreach.replyMessageId = newReply.messageId;
                    outreach.replyBodyContent = newReply.bodyContent;
                    outreach.replyDetectedIn = newReply.detectedIn;
                    outreach.replyMatchConfidence = newReply.matchConfidence;
                    outreach.replyReviewStatus = newReply.reviewStatus;
                    outreach.replyAttachments = attachments;
                    outreach.syncSource = 'imap_poll';

                    await outreach.save();
                    inboxMatched++;

                    console.log(`[IMAP] Reply detected: ${fromEmail} → outreach ${outreach._id}`);

                    // Log to ActivityLog
                    await ActivityLog.logActivity({
                        user:       connection.employee,
                        userName:   connection.employeeName,
                        action:     'sync',
                        module:     'outreach',
                        targetId:   String(outreach._id),
                        targetName: outreach.university || outreach.name,
                        details:    { fromEmail, syncSource: 'imap_poll', messageId },
                        method:     'POST',
                        path:       '/jobs/imapReplySync',
                        statusCode: 200
                    });

                    // Notify admin by email
                    try {
                        const { subject, html } = buildAdminNotificationEmail(outreach, { name: connection.employeeName });
                        await sendEmail({
                            to: process.env.SMTP_ADMIN_EMAIL,
                            subject,
                            html
                        });
                    } catch (notifyErr) {
                        console.warn(`[IMAP] Admin notification failed:`, notifyErr.message);
                    }

                    // Notify admins in-app too (additive to the email above) so a
                    // legacy Outreach reply needing confirm/reject shows in the bell.
                    // Never throws.
                    await emitToAdmins({
                        category: 'approval',
                        title: 'Legacy Outreach reply to review',
                        body: `A reply from ${fromEmail} was detected on "${outreach.university || outreach.name || 'a record'}" and needs confirm/reject.`,
                        module: 'Outreach',
                        link: '/outreach'
                    });
                }
            }
        } finally {
            lock.release();
        }

        // ── Pass 2: SENT — reconcile out-of-band employee sends ──────────
        // Same connection, same sync window; the cursor advances only after this
        // also succeeds (a missing Sent folder is a clean skip, not an error).
        // Writes to records on every poll, so it is gated behind the
        // SENT_RECONCILE_ENABLED=true flag (off by default) — see syncSentReplies.
        sentMatched = await syncSentReplies({ client, connection, since });

        // Update connection state only after BOTH passes succeed — a failure in
        // either bubbles to the outer catch (mailbox → 'error', lastSyncAt
        // untouched) so the window is retried next tick. Message-ID dedupe keeps
        // the replay safe.
        connection.lastSyncAt = new Date();
        connection.status = 'active';
        connection.lastError = null;
        connection.totalMatched = (connection.totalMatched || 0) + inboxMatched + sentMatched;
        await connection.save();

        console.log(`[IMAP] ${connection.emailAddress}: done, ${inboxMatched} reply detection(s), ${sentMatched} sent reconcile(s)`);
    } catch (err) {
        console.error(`[IMAP] Error syncing ${connection.emailAddress}:`, err.message);
        // Only break-notify on a healthy → error transition (see decrypt-fail
        // path above): a mailbox stuck in error would otherwise re-notify every
        // 15-minute poll forever.
        const wasError = connection.status === 'error';
        connection.status = 'error';
        connection.lastError = err.message;
        connection.lastErrorAt = new Date();
        await connection.save();

        if (!wasError) {
            await emitToUser({
                recipientId: connection.employee,
                category: 'status',
                title: 'Mailbox connection broken',
                body: `Mailbox ${connection.emailAddress} stopped syncing: ${err.message}. Check the connection or its credentials.`,
                module: 'Mailboxes',
                link: '/mailbox-connections'
            });
        }
    } finally {
        try { await client.logout(); } catch (_) { /* ignore */ }
    }
};

// ─── Pass 2: SENT folder — reconcile out-of-band employee sends ───────────────
// Symmetric twin of the INBOX pass. When an employee answers a partner reply
// directly in their mail client (gmail.com, Outlook) instead of the ERP composer,
// the send never reaches the DB: the record stays Reply Received/unread and the
// ERP thread shows a gap. Scanning the mailbox's SENT folder and matching
// To/Cc == partner reconciles that send back onto the matching Outreach Mail
// record(s). Mail the ERP itself sent (Gmail API / SMTP) is skipped via the RFC
// Message-ID dedupe — those already carry a logged `sent` leg, so nothing is
// double-logged and status does not churn. Returns the number of records updated.
//
// Only Outreach Mail (outreachnews) is reconciled here; the legacy Outreach
// review pipeline is deliberately left to its human confirm/reject flow.
export const syncSentReplies = async ({ client, connection, since }) => {
    // Safety gate — the Sent pass WRITES to records on every poll, so it stays OFF
    // unless SENT_RECONCILE_ENABLED=true (see utils/outreachSentSync.js). Unset the
    // flag to stop reconcile without a code change or redeploy.
    if (!sentReconcileEnabled()) {
        console.log(`[IMAP] ${connection.emailAddress}: sent reconcile disabled (set SENT_RECONCILE_ENABLED=true to enable)`);
        return 0;
    }

    const boxes = await client.list();
    const sentPath = resolveSentMailboxPath(boxes);
    if (!sentPath) {
        console.log(`[IMAP] ${connection.emailAddress}: no Sent folder found, skipping sent reconcile`);
        return 0;
    }

    const lock = await client.getMailboxLock(sentPath);
    try {
        // ── Collect messages first (ImapFlow deadlock prevention) ─────────
        const rawMessages = [];
        for await (const msg of client.fetch({ since }, { envelope: true, source: true })) {
            rawMessages.push({ envelope: msg.envelope, source: msg.source });
        }

        let matched = 0;

        for (const msg of rawMessages) {
            const senderEmail = msg.envelope?.from?.[0]?.address?.toLowerCase()?.trim();
            if (!senderEmail) continue;
            // Only mail actually SENT BY the mailbox owner is an employee send;
            // anything else sitting in Sent (imported copies, drafts) must not
            // touch records.
            if (senderEmail !== String(connection.emailAddress).toLowerCase().trim()) continue;

            const messageId = msg.envelope?.messageId || null;
            const recipients = [
                ...(msg.envelope?.to || []),
                ...(msg.envelope?.cc || [])
            ]
                .map((a) => a?.address)
                .filter((a) => a && String(a).trim());
            if (recipients.length === 0) continue;

            // Active, non-Closed Outreach Mail records whose partner email is among
            // the recipients — anchored + escaped regex per address, the DB form of
            // the recipientMatches rule in src/utils/outreachSentSync.js.
            const patterns = [...new Set(recipients.map((a) => String(a).toLowerCase().trim()))]
                .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            const records = await OutreachNew.find({
                status: 'active',
                outreachStatus: { $ne: 'Closed' },
                $or: patterns.flatMap((p) => [
                    { email: { $regex: new RegExp(`^${p}$`, 'i') } },
                    { alternativeEmails: { $regex: new RegExp(`^${p}$`, 'i') } }
                ])
            });

            // Skip when every matched record already carries this RFC Message-ID —
            // the ERP's own sends are logged legs already; nothing to reconcile.
            const eligible = records.filter((r) => {
                if (!r.emails) r.emails = [];
                return !alreadyHasMessageId(r.emails, messageId);
            });
            if (eligible.length === 0) continue;

            // Parse once per message, share across all matched records.
            const { body, attachments } = await parseSource(msg.source);

            for (const record of eligible) {
                record.emails.push({
                    messageId,
                    direction: 'sent',
                    from: connection.emailAddress,
                    to: record.email,
                    subject: msg.envelope?.subject || '(No Subject)',
                    body: body || '',
                    sentAt: msg.envelope?.date || new Date(),
                    sentBy: connection.employee,
                    sentByName: connection.employeeName,
                    attachments
                });

                // Thread modal renders emails[] in stored order — a gmail-side send
                // can be older than already-logged legs, so keep the timeline
                // chronological (idempotent).
                record.emails.sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));

                const next = reconciledStatus(record.outreachStatus);
                record.outreachStatus = next;
                if (next === 'Replied') record.hasUnreadReply = false;
                await record.save();
                matched++;

                console.log(`[IMAP] Sent reconcile: ${connection.emailAddress} → ${record.university} (${record.email}) ${messageId}`);

                // Log to ActivityLog
                await ActivityLog.logActivity({
                    user:       connection.employee,
                    userName:   connection.employeeName,
                    action:     'sync',
                    module:     'outreach-new',
                    targetId:   String(record._id),
                    targetName: record.university,
                    details:    { toEmail: record.email, syncSource: 'sent_imap_poll', messageId },
                    method:     'POST',
                    path:       '/jobs/imapReplySync',
                    statusCode: 200
                });
            }
        }
        return matched;
    } finally {
        lock.release();
    }
};


// ─── Run sync for all active mailboxes ────────────────────────────────────────
export const runImapSyncAllMailboxes = async () => {
    console.log(`[IMAP] Sync started at ${new Date().toISOString()}`);

    let connections = [];
    try {
        connections = await MailboxConnection.find({ status: { $ne: 'disconnected' } });
    } catch (err) {
        console.error('[IMAP] Failed to fetch mailbox connections:', err.message);
        return;
    }

    if (connections.length === 0) {
        console.log('[IMAP] No active mailbox connections found. Skipping.');
        return;
    }

    console.log(`[IMAP] Polling ${connections.length} mailbox(es)`);
    await Promise.allSettled(connections.map(syncMailbox));
    console.log('[IMAP] Sync complete');
};

// ─── Register cron (every 15 minutes, IST) ───────────────────────────────────
export const startImapSyncJob = () => {
    cron.schedule('*/15 * * * *', runImapSyncAllMailboxes, {
        timezone: 'Asia/Kolkata'
    });
    console.log('✅ IMAP reply sync job registered (every 15 min, IST)');
};
