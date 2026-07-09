import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import MailboxConnection from '../src/models/MailboxConnection.js';
import OutreachNew from '../src/models/OutreachNew.js';
import Outreach from '../src/models/Outreach.js';
import { decrypt } from '../src/services/cryptoService.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Find the active MailboxConnection
        const connection = await MailboxConnection.findOne({});
        if (!connection) {
            console.error('No MailboxConnection found in database.');
            return;
        }

        console.log(`Using mailbox: ${connection.emailAddress}`);
        const appPassword = decrypt(connection.appPassword);

        // Setting logger to console to print full IMAP raw commands
        const client = new ImapFlow({
            host: connection.imapHost || 'imap.gmail.com',
            port: connection.imapPort || 993,
            secure: true,
            auth: {
                user: connection.emailAddress,
                pass: appPassword
            },
            logger: {
                debug: (...args) => console.log('[IMAP FLOW DEBUG]', ...args),
                info: (...args) => console.log('[IMAP FLOW INFO]', ...args),
                warn: (...args) => console.warn('[IMAP FLOW WARN]', ...args),
                error: (...args) => console.error('[IMAP FLOW ERROR]', ...args)
            }
        });

        console.log('Connecting to IMAP client...');
        await client.connect();
        console.log('Connected. Obtaining lock on INBOX...');
        const lock = await client.getMailboxLock('INBOX');

        try {
            // Let's search back 48 hours to find replies
            const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
            console.log(`Fetching messages since: ${since.toISOString()}`);

            const rawMessages = [];
            for await (const msg of client.fetch(
                { since },
                { envelope: true, source: true }
            )) {
                rawMessages.push({
                    envelope:  msg.envelope,
                    source:    msg.source
                });
            }

            console.log(`Fetched ${rawMessages.length} messages from inbox.`);

            for (const msg of rawMessages) {
                const fromEmail = msg.envelope?.from?.[0]?.address?.toLowerCase()?.trim();
                const subject = msg.envelope?.subject || '(No Subject)';
                const messageId = msg.envelope?.messageId || null;
                const date = msg.envelope?.date;

                console.log(`\n----------------------------------------`);
                console.log(`Email details:`);
                console.log(`  From: ${fromEmail}`);
                console.log(`  Subject: ${subject}`);
                console.log(`  Message-ID: ${messageId}`);
                console.log(`  Date: ${date}`);

                if (!fromEmail) {
                    console.log(`  [Skip] No sender email address found.`);
                    continue;
                }

                // Check matches in OutreachNew
                const cleanFrom = fromEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const outreachNewMatch = await OutreachNew.findOne({
                    $or: [
                        { email: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } },
                        { alternativeEmails: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } }
                    ],
                    outreachStatus: { $ne: 'Closed' }
                });

                console.log(`  OutreachNew Match found? ${outreachNewMatch ? 'YES (ID: ' + outreachNewMatch._id + ', Status: ' + outreachNewMatch.outreachStatus + ')' : 'NO'}`);

                const outreachMatch = await Outreach.findOne({
                    $or: [
                        { email: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } },
                        { alternativeEmails: { $regex: new RegExp(`^${cleanFrom}$`, 'i') } }
                    ],
                    outreachStatus: { $ne: 'Closed' }
                });
                console.log(`  Outreach Match found? ${outreachMatch ? 'YES (ID: ' + outreachMatch._id + ')' : 'NO'}`);

                if (messageId) {
                    const loggedInNew = await OutreachNew.exists({ 'emails.messageId': messageId });
                    console.log(`  Already logged in OutreachNew? ${loggedInNew ? 'YES' : 'NO'}`);
                }

                if (outreachNewMatch) {
                    // Let's see if we should parse it
                    console.log('  Parsing body...');
                    const parsed = await simpleParser(msg.source);
                    const rawBody = parsed.text || parsed.html?.replace(/<[^>]*>/g, ' ') || '';
                    console.log(`  Body preview (first 100 chars): ${rawBody.trim().substring(0, 100)}...`);
                }
            }

        } finally {
            lock.release();
            console.log('Inbox lock released.');
        }

        await client.logout();
        console.log('Logged out.');

    } catch (error) {
        console.error('Error running verbose sync test:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
