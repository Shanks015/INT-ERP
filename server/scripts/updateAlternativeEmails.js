import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import OutreachNew from '../src/models/OutreachNew.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const emailToAdd = 'nikithathrimurthy@gmail.com';
        const record = await OutreachNew.findOne({ email: 'prime9739135140@gmail.com' });
        
        if (!record) {
            console.error('Outreach record for prime9739135140@gmail.com not found!');
            return;
        }

        console.log(`Found record: ${record.university} (ID: ${record._id})`);
        
        if (!record.alternativeEmails.includes(emailToAdd)) {
            record.alternativeEmails.push(emailToAdd);
            // Also reset outreach status to 'Sent' so it is eligible for reply matching
            record.outreachStatus = 'Sent';
            await record.save();
            console.log(`Added ${emailToAdd} to alternativeEmails and set status to "Sent".`);
        } else {
            console.log(`${emailToAdd} is already in alternativeEmails.`);
        }

    } catch (error) {
        console.error('Error running script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

run();
