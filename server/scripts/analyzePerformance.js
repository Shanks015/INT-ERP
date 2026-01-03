import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import CampusVisit from '../src/models/CampusVisit.js';
import Scholar from '../src/models/ScholarInResidence.js';

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Check Indexes
        console.log('\n--- Checking Indexes ---');
        const indexes = await CampusVisit.collection.indexes();
        console.log('CampusVisit Indexes:', JSON.stringify(indexes, null, 2));

        // 2. Measure Search Performance (Regex vs No Regex)
        console.log('\n--- Benchmarking Queries ---');

        // Baseline: Simple Find
        console.time('Simple Find (All)');
        await CampusVisit.find({}).limit(20);
        console.timeEnd('Simple Find (All)');

        // Indexed Filter: Status
        console.time('Indexed Filter (Status=active)');
        await CampusVisit.find({ status: 'active' }).limit(20);
        console.timeEnd('Indexed Filter (Status=active)');

        // Text Search (The new solution)
        console.time('Text Search (University)');
        await CampusVisit.find({ $text: { $search: 'University' } }).limit(20);
        console.timeEnd('Text Search (University)');

        // 3. Count Total Docs
        const count = await CampusVisit.countDocuments();
        console.log(`\nTotal Campus Visits: ${count}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
