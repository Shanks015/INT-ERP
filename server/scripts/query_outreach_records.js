import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import OutreachNew from '../src/models/OutreachNew.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function query() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const records = await OutreachNew.find({}, 'university email alternativeEmails outreachStatus hasUnreadReply emails');
        console.log('\n--- OutreachNew Records ---');
        records.forEach(r => {
            console.log(`- ID: ${r._id}`);
            console.log(`  University: ${r.university}`);
            console.log(`  Email: ${r.email}`);
            console.log(`  Alternative: ${r.alternativeEmails.join(', ')}`);
            console.log(`  Status: ${r.outreachStatus}`);
            console.log(`  Unread Reply: ${r.hasUnreadReply}`);
            console.log(`  Emails (${r.emails.length}):`);
            r.emails.forEach((m, idx) => {
                console.log(`    [${idx}] Direction: ${m.direction}, From: ${m.from}, Subject: ${m.subject}, Body: "${m.body}"`);
            });
        });

    } catch (error) {
        console.error('Error querying:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

query();
