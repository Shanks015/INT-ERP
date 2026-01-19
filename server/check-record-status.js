import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Partner from './src/models/Partner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
    .then(async () => {
        // Check recordStatus values (this handles expiry)
        const recordStatusDist = await Partner.aggregate([
            { $group: { _id: '$recordStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        console.log('Record Status Distribution (Active/Expired):');
        console.log(JSON.stringify(recordStatusDist, null, 2));

        // activeStatus
        const activeStatusDist = await Partner.aggregate([
            { $group: { _id: '$activeStatus', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log('\nactiveStatus Distribution (Manual Active/Inactive):');
        console.log(JSON.stringify(activeStatusDist, null, 2));

        // Count overlapping
        const activeAndValid = await Partner.countDocuments({
            activeStatus: 'Active',
            recordStatus: 'active'
        });

        console.log(`\nPartners that are BOTH 'Active' (manual) AND 'active' (non-expired): ${activeAndValid}`);

        process.exit(0);
    })
    .catch(err => {
        console.log('ERROR', err);
        process.exit(1);
    });
