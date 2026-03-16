
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CampusVisit from './src/models/CampusVisit.js';

dotenv.config();

const inspectCV = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const records = await CampusVisit.find({}).sort({ visitorName: 1 });
    console.log(`\nFound ${records.length} CampusVisit records.`);

    // Dump first 20 to see duplicates
    for (let i = 0; i < 20 && i < records.length; i++) {
        const r = records[i];
        console.log({
            id: r._id,
            visitor: JSON.stringify(r.visitorName),
            date: r.date ? r.date.toISOString() : 'NULL',
            uni: JSON.stringify(r.universityName)
        });
    }

    process.exit(0);
};

inspectCV();
