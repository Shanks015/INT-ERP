import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Outreach from '../src/models/Outreach.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function query() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const records = await Outreach.find({}, 'name university email outreachStatus replyReviewStatus replySubject');
        console.log('\n--- Old Outreach Records ---');
        if (records.length === 0) {
            console.log('No old outreach records found.');
        } else {
            records.forEach(r => {
                console.log(`- ID: ${r._id}`);
                console.log(`  Name: ${r.name}`);
                console.log(`  University: ${r.university}`);
                console.log(`  Email: ${r.email}`);
                console.log(`  OutreachStatus: ${r.outreachStatus}`);
                console.log(`  ReplyReviewStatus: ${r.replyReviewStatus}`);
                console.log(`  ReplySubject: ${r.replySubject}`);
            });
        }

    } catch (error) {
        console.error('Error querying:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

query();
