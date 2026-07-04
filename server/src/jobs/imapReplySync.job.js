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
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ─── Core sync function for a single mailbox ─────────────────────────────────
export const syncMailbox = async (connection) => {
    let appPassword;
    try {
        appPassword = decrypt(connection.appPassword);
    } catch (err) {
        console.error(`[IMAP] Decryption failed for ${connection.emailAddress}:`, err.message);
        connection.status = 'error';
        connection.lastError = 'Failed to decrypt app password';
        connection.lastErrorAt = new Date();
        await connection.save();
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
        const lock = await client.getMailboxLock('INBOX');

        try {
            // Fetch emails since last sync (or last 48h on first run)
            const since = connection.lastSyncAt
                ? new Date(connection.lastSyncAt)
                : new Date(Date.now() - 48 * 60 * 60 * 1000);

            // ── Collect messages first (ImapFlow deadlock prevention) ─────────
            // ImapFlow forbids issuing IMAP commands inside a for-await loop;
            // we buffer all raw sources here, then process them afterward.
            const rawMessages = [];
            for await (const msg of client.fetch(
                { since, seen: false },
                { envelope: true, source: true }
            )) {
                rawMessages.push({
                    envelope:  msg.envelope,
                    source:    msg.source   // Buffer — full RFC822 source
                });
            }

            let matched = 0;

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

                // Find a matching outreach record (not closed)
                const outreach = await Outreach.findOne({
                    email: { $regex: new RegExp(`^${fromEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                    outreachStatus: { $ne: 'Closed' }
                });

                const outreachNew = await OutreachNew.findOne({
                    email: { $regex: new RegExp(`^${fromEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
                    outreachStatus: { $ne: 'Closed' }
                });

                if (!outreach && !outreachNew) continue;

                // ── Parse the email body and attachments ──────────────────────
                let replyBodyContent = null;
                let attachments = [];
                if (msg.source) {
                    try {
                        const parsed = await simpleParser(msg.source);
                        const rawBody = parsed.text || parsed.html?.replace(/<[^>]*>/g, ' ') || '';
                        replyBodyContent = rawBody.trim().slice(0, 10000) || null;

                        // Save attachments if present
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
                                    const filePath = path.join(attachmentsDir, safeFilename);
                                    
                                    fs.writeFileSync(filePath, att.content);
                                    
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
                    } catch (parseErr) {
                        console.warn(`[IMAP] Body parse failed for ${fromEmail}:`, parseErr.message);
                    }
                }

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
                    matched++;

                    console.log(`[IMAP] Reply detected for Outreach New: ${fromEmail} → ${outreachNew._id}`);

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
                } else if (outreach) {
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
                    matched++;

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
                }
            }

            // Update connection state
            connection.lastSyncAt = new Date();
            connection.status = 'active';
            connection.lastError = null;
            connection.totalMatched = (connection.totalMatched || 0) + matched;
            await connection.save();

            console.log(`[IMAP] ${connection.emailAddress}: done, ${matched} new reply detection(s)`);
        } finally {
            lock.release();
        }
    } catch (err) {
        console.error(`[IMAP] Error syncing ${connection.emailAddress}:`, err.message);
        connection.status = 'error';
        connection.lastError = err.message;
        connection.lastErrorAt = new Date();
        await connection.save();
    } finally {
        try { await client.logout(); } catch (_) { /* ignore */ }
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
