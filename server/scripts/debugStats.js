import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Event from '../src/models/Event.js';
import Scholar from '../src/models/ScholarInResidence.js';
import CampusVisit from '../src/models/CampusVisit.js';

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        console.log('--- Events Aggregation ---');
        const events = await Event.aggregate([{ $group: { _id: "$type", count: { $sum: 1 } } }]);
        console.log(JSON.stringify(events, null, 2));

        console.log('--- Scholars Aggregation ---');
        const scholars = await Scholar.aggregate([
            { $group: { _id: "$country", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        console.log(JSON.stringify(scholars, null, 2));

        console.log('--- Campus Visits Aggregation ---');
        // Check if dates are actual Dates
        const sampleVisit = await CampusVisit.findOne();
        console.log('Sample Visit Date Type:', sampleVisit ? typeof sampleVisit.date : 'No visits');
        console.log('Sample Visit Date Value:', sampleVisit ? sampleVisit.date : 'N/A');

        const visits = await CampusVisit.aggregate([
            { $group: { _id: { $month: "$date" }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        console.log(JSON.stringify(visits, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
