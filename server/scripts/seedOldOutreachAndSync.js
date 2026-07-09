import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Outreach from '../src/models/Outreach.js';
import OutreachNew from '../src/models/OutreachNew.js';
import { runImapSyncAllMailboxes } from '../src/jobs/imapReplySync.job.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Seed old Outreach record
        const emailToMatch = 'nikithathrimurthy@gmail.com';
        let oldOutreach = await Outreach.findOne({ email: emailToMatch });

        if (!oldOutreach) {
            console.log(`Creating test old Outreach record for ${emailToMatch}...`);
            oldOutreach = new Outreach({
                name: 'Old Target Admin',
                university: 'Old DSU Testing Labs',
                country: 'India',
                email: emailToMatch,
                outreachStatus: 'Pending Partner Review',
                automationActive: true
            });
            await oldOutreach.save();
            console.log('Old Outreach record created!');
        } else {
            console.log('Old Outreach record already exists. Resetting status...');
            oldOutreach.outreachStatus = 'Pending Partner Review';
            oldOutreach.replyReviewStatus = null;
            oldOutreach.replyDetectedAt = null;
            oldOutreach.replySubject = null;
            oldOutreach.replyBodyContent = null;
            oldOutreach.detectedReplies = [];
            await oldOutreach.save();
        }

        // 2. Clear emails in OutreachNew to allow re-processing the same message IDs
        const newRecord = await OutreachNew.findOne({ email: 'prime9739135140@gmail.com' });
        if (newRecord) {
            console.log('Clearing emails from new OutreachNew record to allow re-sync of the message...');
            newRecord.emails = [];
            newRecord.outreachStatus = 'Sent';
            newRecord.hasUnreadReply = false;
            await newRecord.save();
            console.log('New OutreachNew record reset.');
        }

        // 3. Run IMAP Sync manually
        console.log('Running IMAP sync job to process the replies...');
        await runImapSyncAllMailboxes();
        console.log('IMAP sync completed.');

        // 4. Verify old record
        const freshOld = await Outreach.findById(oldOutreach._id);
        console.log('\n--- Verified Old Outreach Record State ---');
        console.log(`University: ${freshOld.university}`);
        console.log(`Status: ${freshOld.outreachStatus}`);
        console.log(`Reply Detected At: ${freshOld.replyDetectedAt}`);
        console.log(`Reply Subject: ${freshOld.replySubject}`);
        console.log(`Detected Replies Count: ${freshOld.detectedReplies?.length}`);

    } catch (error) {
        console.error('Error running script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
