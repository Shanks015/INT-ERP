import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import MailboxConnection from '../src/models/MailboxConnection.js';
import User from '../src/models/User.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function query() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const users = await User.find({}, 'name email role');
        console.log('\n--- Registered Users ---');
        users.forEach(u => console.log(`- ${u.name} (${u.email}) [Role: ${u.role}, ID: ${u._id}]`));

        const connections = await MailboxConnection.find({});
        console.log('\n--- Mailbox Connections ---');
        if (connections.length === 0) {
            console.log('No mailbox connections found.');
        } else {
            connections.forEach(c => {
                console.log(`- Employee: ${c.employeeName} (${c.emailAddress})`);
                console.log(`  IMAP Host: ${c.imapHost}:${c.imapPort}`);
                console.log(`  Status: ${c.status}`);
                console.log(`  Last Sync: ${c.lastSyncAt}`);
                console.log(`  Last Error: ${c.lastError} at ${c.lastErrorAt}`);
            });
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
}

query();
