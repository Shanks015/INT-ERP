import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { runImapSyncAllMailboxes } from '../src/jobs/imapReplySync.job.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Running IMAP sync job manually...');
        await runImapSyncAllMailboxes();
        console.log('IMAP sync job completed.');

    } catch (error) {
        console.error('Error running sync job:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
