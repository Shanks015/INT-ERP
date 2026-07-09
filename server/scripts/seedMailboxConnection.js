import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import MailboxConnection from '../src/models/MailboxConnection.js';
import User from '../src/models/User.js';
import { encrypt } from '../src/services/cryptoService.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Find admin user
        const adminUser = await User.findOne({ email: 'admin@dsu.edu.in' });
        if (!adminUser) {
            console.error('Admin user (admin@dsu.edu.in) not found in database! Please run create-admin first.');
            return;
        }

        console.log(`Found Admin user: ${adminUser.name} (${adminUser.email})`);

        // Check if mailbox connection already exists
        const existing = await MailboxConnection.findOne({ employee: adminUser._id });
        if (existing) {
            console.log('Mailbox connection already exists for admin. Updating it with .env credentials...');
            existing.emailAddress = process.env.SMTP_USER || 'prime9739135140@gmail.com';
            existing.appPassword = encrypt(process.env.SMTP_PASS || 'pazwjidattqotfmj');
            existing.imapHost = 'imap.gmail.com';
            existing.imapPort = 993;
            existing.status = 'active';
            await existing.save();
            console.log('Updated successfully!');
        } else {
            console.log('Creating new Mailbox connection for admin...');
            const mailbox = new MailboxConnection({
                employee: adminUser._id,
                employeeName: adminUser.name,
                emailAddress: process.env.SMTP_USER || 'prime9739135140@gmail.com',
                appPassword: encrypt(process.env.SMTP_PASS || 'pazwjidattqotfmj'),
                imapHost: 'imap.gmail.com',
                imapPort: 993,
                status: 'active'
            });
            await mailbox.save();
            console.log('Created successfully!');
        }

    } catch (error) {
        console.error('Error running script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
