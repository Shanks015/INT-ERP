import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import MailboxConnection from '../src/models/MailboxConnection.js';
import { decrypt } from '../src/services/cryptoService.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const connection = await MailboxConnection.findOne({});
        if (!connection) {
            console.error('No MailboxConnection found.');
            return;
        }

        const appPassword = decrypt(connection.appPassword);
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

        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        try {
            const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
            console.log('Fetching messages...');

            for await (const msg of client.fetch(
                { since },
                { envelope: true, source: true }
            )) {
                const fromEmail = msg.envelope?.from?.[0]?.address?.toLowerCase()?.trim();
                const subject = msg.envelope?.subject || '';
                
                if (subject.includes('SMTP Test') || fromEmail.includes('nikithathrimurthy')) {
                    console.log(`\n========================================`);
                    console.log(`From: ${fromEmail}`);
                    console.log(`Subject: ${subject}`);
                    
                    if (msg.source) {
                        const parsed = await simpleParser(msg.source);
                        console.log('Parsed properties:');
                        console.log('  - messageId:', parsed.messageId);
                        console.log('  - inReplyTo:', parsed.inReplyTo);
                        console.log('  - references:', parsed.references);
                        console.log('  - header keys:', Array.from(parsed.headers.keys()));
                        console.log('  - raw in-reply-to header:', parsed.headers.get('in-reply-to'));
                        console.log('  - raw references header:', parsed.headers.get('references'));
                    }
                }
            }
        } finally {
            lock.release();
        }

        await client.logout();
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
