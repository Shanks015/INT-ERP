import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Partner from './src/models/Partner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from simple path or current directory
dotenv.config();

console.log('--- Database Diagnostic Script ---');
const uri = process.env.MONGODB_URI;
console.log(`Configured URI: ${uri ? uri.replace(/:([^:@]+)@/, ':****@') : 'UNDEFINED'}`);

if (!uri) {
    console.error('ERROR: MONGODB_URI is not defined in environment!');
    process.exit(1);
}

mongoose.connect(uri)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        // 1. Check total count
        const total = await Partner.countDocuments({});
        console.log(`\nTotal Partners: ${total}`);

        if (total === 0) {
            console.log('Collection is empty. Application must be showing cached or mock data.');
            process.exit(0);
        }

        // 2. Check activeStatus values
        const activeStatusDist = await Partner.aggregate([
            { $group: { _id: '$activeStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\nDistribution by activeStatus (all records):');
        console.log(JSON.stringify(activeStatusDist, null, 2));

        // 3. Check status values
        const statusDist = await Partner.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\nDistribution by status (workflow status):');
        console.log(JSON.stringify(statusDist, null, 2));

        // 4. Test specific queries
        const activeOnly = await Partner.countDocuments({ activeStatus: 'Active' });
        const activeAndStatus = await Partner.countDocuments({ status: 'active', activeStatus: 'Active' });

        console.log('\nQuery Tests:');
        console.log(`count({ activeStatus: 'Active' }) = ${activeOnly}`);
        console.log(`count({ status: 'active', activeStatus: 'Active' }) = ${activeAndStatus}`);

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
